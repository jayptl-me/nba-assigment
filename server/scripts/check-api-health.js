#!/usr/bin/env node

/**
 * API Health Check Utility
 * 
 * This script monitors the Ball Don't Lie API health and rate limit status.
 * It helps diagnose issues with the API and provides guidance on rate limits.
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'https://api.balldontlie.io/v1';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Fetch with retry and exponential backoff
async function fetchWithRetry(url, config, maxRetries = 2, initialDelay = 2000) {
  let lastError;
  let retryCount = 0;
  let delay = initialDelay;
  
  while (retryCount <= maxRetries) {
    try {
      if (retryCount === 0) {
        console.log(`${colors.blue}Sending request to: ${url}${colors.reset}`);
      } else {
        console.log(`${colors.blue}Retry attempt ${retryCount}/${maxRetries} after ${delay/1000}s delay...${colors.reset}`);
      }
      
      const response = await axios(url, config);
      return response;
    } catch (error) {
      lastError = error;
      
      if (error.response && error.response.status === 429 && retryCount < maxRetries) {
        // Rate limited - try to extract retry-after header
        const retryAfter = error.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
        
        console.log(`${colors.yellow}Rate limit exceeded. Waiting ${waitTime/1000}s before retry...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retryCount++;
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

// Check API endpoints
async function checkApiHealth() {
  console.log(`\n${colors.magenta}=== Ball Don't Lie API Health Check ====${colors.reset}\n`);
  
  // Check if API key is set
  if (!process.env.API_KEY) {
    console.log(`${colors.red}✗ No API_KEY found in .env file${colors.reset}`);
    console.log(`${colors.yellow}Please create a .env file based on .env.example and set your API key${colors.reset}`);
    return;
  }
  
  const headers = {
    'Authorization': process.env.API_KEY,
    'Accept': 'application/json',
    'User-Agent': 'SportsOrca/1.0'
  };
  
  const endpoints = [
    { name: 'Games', url: `${API_BASE_URL}/games?per_page=1` },
    { name: 'Teams', url: `${API_BASE_URL}/teams?per_page=1` },
    { name: 'Players', url: `${API_BASE_URL}/players?per_page=1` }
  ];
  
  let overallStatus = true;
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`\n${colors.cyan}Testing endpoint: ${endpoint.name}${colors.reset}`);
    
    try {
      const startTime = Date.now();
      const response = await fetchWithRetry(endpoint.url, { headers, timeout: 10000 });
      const endTime = Date.now();
      
      const rateLimit = {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        reset: response.headers['x-ratelimit-reset']
      };
      
      results.push({
        endpoint: endpoint.name,
        status: response.status,
        responseTime: endTime - startTime,
        rateLimit
      });
      
      console.log(`${colors.green}✓ ${endpoint.name}: Status ${response.status}, ${endTime - startTime}ms${colors.reset}`);
      
      if (rateLimit.remaining) {
        const percentRemaining = (parseInt(rateLimit.remaining) / parseInt(rateLimit.limit)) * 100;
        const color = percentRemaining < 20 ? colors.red : percentRemaining < 50 ? colors.yellow : colors.green;
        
        console.log(`${color}  Rate limit: ${rateLimit.remaining}/${rateLimit.limit} remaining (${percentRemaining.toFixed(1)}%)${colors.reset}`);
      }
      
      // Add a delay between requests to avoid triggering rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      overallStatus = false;
      
      if (error.response) {
        console.log(`${colors.red}✗ ${endpoint.name}: Failed with status ${error.response.status}${colors.reset}`);
        
        if (error.response.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          console.log(`${colors.yellow}  Rate limit exceeded. Retry after: ${retryAfter || 'unknown'} seconds${colors.reset}`);
        } else if (error.response.status === 401) {
          console.log(`${colors.yellow}  Authentication error. Your API key may be invalid.${colors.reset}`);
        }
      } else if (error.request) {
        console.log(`${colors.red}✗ ${endpoint.name}: No response received from server${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ ${endpoint.name}: ${error.message}${colors.reset}`);
      }
    }
  }
  
  // Summary
  console.log(`\n${colors.magenta}=== API Health Summary ====${colors.reset}`);
  
  if (overallStatus) {
    console.log(`\n${colors.green}✓ All API endpoints are operational${colors.reset}`);
  } else {
    console.log(`\n${colors.red}✗ Some API endpoints are experiencing issues${colors.reset}`);
  }
  
  // Rate limit advice
  console.log(`\n${colors.cyan}Rate Limit Recommendations:${colors.reset}`);
  console.log(`- Free tier: 60 requests/minute`);
  console.log(`- Implement caching for frequently accessed data`);
  console.log(`- Use exponential backoff for retries (already implemented)`);
  console.log(`- Consider batch requests when possible`);
  
  console.log(`\n${colors.yellow}To run the app with better rate limit handling:${colors.reset}`);
  console.log(`1. Ensure server/.env has a valid API_KEY`);
  console.log(`2. Use the updated API client with retry logic`);
  console.log(`3. Check logs/requests.log for API request patterns`);
}

// Run the script
checkApiHealth().catch(error => {
  console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
  process.exit(1);
});
