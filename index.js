const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const fs = require('fs');

const app = express();
const port = 3000;
const PORT = 3000;
const baseUrls = [
  'https://xgroovy.com/categories/young/',
  'https://xgroovy.com/',
  'https://xgroovy.com/best/',
  'https://xgroovy.com/categories/rough/',
  'https://xgroovy.com/categories/creampie/'
];

async function getLinks(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const links = [];

    $('a').each((index, element) => {
      const href = $(element).attr('href');
      if (href && href.startsWith('https://xgroovy.com/videos/')) {
        links.push(href);
      }
    });

    console.log('Links fetched successfully.');
    return links;
  } catch (error) {
    console.error('Error fetching links:', error);
    return [];
  }
}

async function getVideoSources(links) {
  const videoSources = await Promise.all(links.map(async link => {
    try {
      const response = await axios.get(link);
      const $ = cheerio.load(response.data);

      const sources = $('video source').map((index, element) => $(element).attr('src')).get();

      return sources.filter(src => src && src.includes('1080p.mp4/?br'));
    } catch (error) {
      console.error(`Error fetching video sources from ${link}:\n`, error);
      return [];
    }
  }));

  return videoSources.flat();
}

async function getFinalRedirectedUrls(links) {
  const redirectedLinks = await Promise.all(links.map(async link => {
    try {
      const response = await axios.get(link, {
        maxRedirects: 0,
        validateStatus: null,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36'
        }
      });

      return response.headers.location || null;
    } catch (error) {
      console.error(`Error fetching final redirected link from ${link}:\n`, error);
      return null;
    }
  }));

  return redirectedLinks.filter(link => link !== null);
}

function saveDataToFile(data, filename) {
  try {
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filename}`);
  } catch (error) {
    console.error(`Error saving data to ${filename}:\n`, error);
  }
}

async function startScraping() {
  for (const baseUrl of baseUrls) {
    try {
      const links = await getLinks(baseUrl);
      console.log(`Step 1 done for ${baseUrl}: Fetched links.`);

      const videoSources = await getVideoSources(links);
      console.log(`Step 2 done for ${baseUrl}: Fetched video sources.`);

      const redirectedLinks = await getFinalRedirectedUrls(videoSources);
      console.log(`Step 3 done for ${baseUrl}: Fetched final redirected links.`);

      const endpoint = `${baseUrl.replace('https://', '').replace(/\//g, '_')}_base`;
      saveDataToFile(redirectedLinks, `${endpoint}.json`);

      app.get(`/${endpoint}`, (req, res) => {
        const data = fs.readFileSync(`${endpoint}.json`);
        const links = JSON.parse(data);
        res.json(links);
      });
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

// Call the function once at the start
startScraping();

// Schedule the task to run every 10 minutes
cron.schedule('*/10 * * * *', startScraping);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
