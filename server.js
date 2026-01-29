const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Proxy endpoint
app.post('/api/proxy', async (req, res) => {
  try {
    const { url } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Ensure URL has protocol
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    // Validate URL format
    new URL(targetUrl);

    // Fetch the content
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000,
      maxRedirects: 5
    });

    // Return content
    res.json({
      success: true,
      content: response.data,
      contentType: response.headers['content-type'],
      url: targetUrl
    });

  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({
      error: error.message || 'Failed to fetch the URL',
      details: error.code
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
});