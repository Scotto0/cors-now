const express = require('express');
const fetch = require('isomorphic-fetch');
const marked = require('marked');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400,
  allowedHeaders: ['X-Requested-With', 'Access-Control-Allow-Origin', 'X-HTTP-Method-Override', 'Content-Type', 'Authorization', 'Accept']
}));

// Read README file once at startup
let readmeContent;
try {
  readmeContent = fs.readFileSync(path.join(__dirname, 'readme.md'), 'utf8');
} catch (error) {
  console.error('Error reading readme.md:', error);
  readmeContent = '# Error\nCould not load README content.';
}

// Root path handler (serves README)
app.get('/', async (req, res) => {
  try {
    const content = marked.parse(readmeContent);
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(content);
  } catch (err) {
    console.error('Error parsing markdown:', err);
    res.status(500).json({ error: 'Failed to render README' });
  }
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content response for favicon
});

// Proxy all other requests
app.get('/*', async (req, res) => {
  try {
    const fetchUrl = req.originalUrl.substring(1); // Remove leading slash
    
    if (!fetchUrl) {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    
    console.log(`Proxying request to: ${fetchUrl}`);
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `External resource responded with ${response.status}` 
      });
    }
    
    const contentType = response.headers.get("content-type") || 'application/json';
    res.setHeader('Content-Type', contentType);
    
    if (contentType.includes('json')) {
      const data = await response.json();
      res.json(data);
    } else if (contentType.includes('text')) {
      const text = await response.text();
      res.send(text);
    } else {
      // For binary data, pipe the response
      response.body.pipe(res);
    }
  } catch (error) {
    console.error('Error proxying request:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
