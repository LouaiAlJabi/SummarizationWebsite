import express from 'express';
import fs from 'fs';
import Papa from 'papaparse';
import he from 'he';
import { pipeline } from '@xenova/transformers';
import axios from 'axios';

const app = express();
const port = 3000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// Define routes
app.get('/', (req, res) => {
    // Render the index template with an empty summary and apiText initially as a place holder
    res.render('index', { models: huggingFaceModels, summary: '' ,apiText: ''});
});

app.post('/process', async (req, res) => {
    // use the functions i wrote
    const selectedModel = req.body.model;
    const rawData = GetData(filePath);
    const extractedData = ExtractDecodeText(rawData, false);
    const toSummarize = extractedData.join('\n');
    const summary = await HFSummary(selectedModel, toSummarize);
    const apiText = await TextGearsSummarize(toSummarize);

    console.log("Summary:", summary); // Log the summary variable

    // Render the index template with the updated summary
    res.render('index', { models: huggingFaceModels, summary ,apiText});
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Functions from the provided code
const filePath = "/Users/louai.aijabi/Desktop/Study/Spring2024/Internship/TextSamples/cs11448lq18426.csv";
const huggingFaceModels = ['Xenova/bart-large-cnn', 'Xenova/distilbart-xsum-12-6', 'Xenova/distilbart-cnn-6-6'];

function ExtractDecodeText(data, responses) {
    let text = [];
    for (let i = 0; i < data.length; i++) {
        if (responses) {
            text.push(he.decode(data[i]['text']))
        } else {
            if (data[i]['parent_id'] === '0') {
                text.push(he.decode(data[i]['text']))
            }
        }
    }

    for (let i = 0; i < text.length; i++) {
        text[i] = text[i].replace(/<\/?(p|br)\s*\/?>/g, '')
    }

    text = text.filter(item => item != '')
    return text;
}

function GetData(filePath) {
    let csvData = fs.readFileSync(filePath, 'utf8')
    let parsedData = Papa.parse(csvData, {
        delimiter: ',',
        skipEmptyLines: true,
        header: true,
    })

    return parsedData.data;
}

async function HFSummary(modelName, data) {
    console.log("\n THIS IS THE START OF THE SUMMARY")
    let pipeSummary3 = await pipeline("summarization", modelName)
    let summary3 = await pipeSummary3(data);
    console.log("THIS IS THE END OF THE SUMMARY")
    return summary3[0]["summary_text"];
}

async function TextGearsSummarize(text) {
    const apiKey = "Bj8UKcCcnmyP4Znr";

    try {
        const response = await axios.post('https://api.textgears.com/summarize', {
            text: text,
        }, {
            params: {
                key: apiKey,
                sentences_number: 5, // Adjust the number of sentences in the summary as needed
            }
        });

        // Extract the summary from the response
        const summary = response.data.response.summary;

        return summary;
    } catch (error) {
        throw new Error(`Error summarizing text: ${error.message}`);
    }
}