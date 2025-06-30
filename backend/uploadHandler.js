// import fs from 'fs';

// import { OpenAI } from 'openai';

// import { Pinecone } from '@pinecone-database/pinecone';
// import dotenv from 'dotenv';

// dotenv.config();
// console.log('Pinecone ENV:', process.env.PINECONE_ENVIRONMENT);
// const pc = new Pinecone({
//   apiKey: process.env.PINECONE_API_KEY,
// });

// const index = pc.index('tutor-index', process.env.PINECONE_ENVIRONMENT);

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// async function getEmbedding(text) {
//   const response = await openai.embeddings.create({
//     model: 'text-embedding-ada-002',
//     input: text
//   });
//   return response.data[0].embedding;
// }



// async function processFile(filePath, metadata) {

//   const rawText = fs.readFileSync(filePath, 'utf-8')+ '\n';
  
//   //const combinedFileContent = chunkText(rawText);
//   const CHUNK_SIZE = 500;
//   const chunks = rawText.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) || [];
//   console.log(`Combined content split into ${chunks.length} chunks.`);
//   const upserts = [];
  
//   for (const [index, chunk] of chunks.entries()) {
    
//     let embeddingResponse = await openai.embeddings.create({
//       model: 'text-embedding-ada-002',
//       input: chunk,
//     });
    
//     let embedding = embeddingResponse.data[0].embedding;
//     console.log('embedding',embedding.length);
//     if (embedding.length < 2048) {
//         const padding = new Array(2048 - embedding.length).fill(0);
//         embedding = [...embedding, ...padding];
//       }

//     const categoryResponse = await openai.chat.completions.create({
//       model: 'gpt-3.5-turbo',
//       messages: [
//         {
//           role: 'system',

//           content: 'You are a helpful assistant. Categorize the following text into one of these subjects: Biology, Physics, Chemistry, Mathematics, or Other.',
//         },
//         { role: 'user', content: `Categorize this text: ${chunk}` },
//       ],
//     });

//     const category = categoryResponse.choices[0].message.content.trim();

//     upserts.push({
//       id: `chunk-${index}`,
//       values: embedding,
//       metadata: {
//               text: chunk,
//               //...metadata,
//             }
//     });
    
    
//   }

//   if (upserts.length > 0) {
//     try {
        
//         const BATCH_SIZE = 100; // Adjust batch size as needed to stay under 2MB
//         for (let i = 0; i < upserts.length; i += BATCH_SIZE) {
//           const batch = upserts.slice(i, i + BATCH_SIZE);
//           try {
//             await index.namespace('ns1').upsert(batch);
            
//             console.log(`Batch ${i / BATCH_SIZE + 1} upserted successfully.`);
//           } catch (error) {
//             console.error(`Error during batch ${i / BATCH_SIZE + 1} upsert:`, error);
//           }
//         }
     
//       console.log('Embeddings successfully stored in Pinecone.');
//     } catch (error) {
//       console.error('Error during Pinecone upsert:', error);
//     }
//   } else {
//     console.log('No data to upsert.');
//   }
// }

// export default processFile;


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pc.index('tutor-index');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Resolve __dirname for ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadTextFiles() {
  const outputDir = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(outputDir);
  let combinedContent = '';

  files.forEach((file) => {
    const filePath = path.join(outputDir, file);
    if (fs.statSync(filePath).isFile() && file.endsWith('.txt')) {
      combinedContent += fs.readFileSync(filePath, 'utf-8') + '\n';
    }
  });

  return combinedContent;
}

export async function ensurePineconeIndex() {
  try {
    const existingIndexesResponse = await pc.listIndexes();
    const existingIndexes = existingIndexesResponse.indexes?.map(index => index.name) || [];

    if (!existingIndexes.includes('tutor-index')) {
      console.log('Creating Pinecone index with dimension 1536...');
      await pc.createIndex({
        name: 'tutor-index',
        dimension: 2048, // Ensure the correct dimension matches the embedding model
      });
      
      console.log('Pinecone index created successfully.');
    } else {
      console.log('Pinecone index already exists.');
    }
  } catch (error) {
    console.error('Error ensuring Pinecone index exists:', error);
  }
}

export async function generateEmbeddingsAndStore(metadata) {
   
  const combinedFileContent = loadTextFiles();
  const CHUNK_SIZE = 500;
  const chunks = combinedFileContent.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) || [];
  console.log(`Total chunks generated: ${chunks.length}`);
  const upserts = [];
   
  for (const [index, chunk] of chunks.entries()) {
    
    let embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: chunk,
    });
    
    let embedding = embeddingResponse.data[0].embedding;
    console.log('embedding',embedding.length);
    if (embedding.length < 2048) {
        const padding = new Array(2048 - embedding.length).fill(0);
        embedding = [...embedding, ...padding];
      }

    const categoryResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',

          content: 'You are a helpful assistant. Categorize the following text into one of these subjects: Biology, Physics, Chemistry, Mathematics, or Other.',
        },
        { role: 'user', content: `Categorize this text: ${chunk}` },
      ],
    });

    const category = categoryResponse.choices[0].message.content.trim();

    upserts.push({
      id: `chunk-${index}`,
      values: embedding,
      metadata: { text: chunk, ...metadata },
    });
    
    
  }
  

  if (upserts.length > 0) {
    try {
        
        const BATCH_SIZE = 100; // Adjust batch size as needed to stay under 2MB
        for (let i = 0; i < upserts.length; i += BATCH_SIZE) {
          const batch = upserts.slice(i, i + BATCH_SIZE);
          try {
            await index.namespace('ns1').upsert(batch);
            
            console.log(`Batch ${i / BATCH_SIZE + 1} upserted successfully.`);
          } catch (error) {
            console.error(`Error during batch ${i / BATCH_SIZE + 1} upsert:`, error);
          }
        }
     
      console.log('Embeddings successfully stored in Pinecone.');
    } catch (error) {
      console.error('Error during Pinecone upsert:', error);
    }
  } else {
    console.log('No data to upsert.');
  }
}

