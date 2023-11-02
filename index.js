const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const app = express();
const port = 3000;

const cache = new NodeCache({ stdTTL: 600 }); // Cache TTL set to 10 minutes

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
};

function getFinalRedirectedUrl(initialUrl) {
    return new Promise((resolve, reject) => {
        request.get({ url: initialUrl, headers, followRedirect: false }, (error, response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                resolve(response.headers.location);
            } else {
                resolve(initialUrl);
            }
        });
    });
}

function scrapeAndGenerateLinks(url) {
    return new Promise((resolve, reject) => {
        const cachedLinks = cache.get(url);
        if (cachedLinks) {
            resolve(cachedLinks);
            return;
        }

        request.get({ url, headers }, (error, response, body) => {
            if (error) {
                reject(error);
                return;
            }

            const $ = cheerio.load(body);
            const imgSrcs = $('img').map((_, img) => $(img).attr('data-lazy-src')).get(); // Extract data-lazy-src attribute

            Promise.all(imgSrcs.map(link => getFinalRedirectedUrl(link)))
                .then(finalRedirectedLinks => {
                    const result = finalRedirectedLinks.map(link => ({ img_src: link }));
                    cache.set(url, result); // Cache the result
                    resolve(result);
                })
                .catch(reject);
        });
    });
}


app.get('/', (req, res) => {
    res.send('Welcome to the GIF API!');
});

// Define routes for different categories
const categories = [
    'anal', 'doggystyle', 'threesome', 'erotic', 'cumshot',
    'blowjob', 'masturbating', 'bdsm', 'cunnilingus', 'oral-sex',
    '69', 'bondage'
];

categories.forEach(category => {
    app.get(`/${category}`, (req, res) => {
        const url = `https://www.dieoff.org/${category}-gif/`;
        scrapeAndGenerateLinks(url)
            .then(linksResult => {
                res.json(linksResult);
            })
            .catch(error => {
                console.error('Error:', error);
                res.status(500).json({ error: 'An error occurred.' });
            });
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
