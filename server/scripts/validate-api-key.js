#!/usr/bin/env node

/**
 * API Key Validator and Rotation Helper
 * 
 * This script helps validate and rotate API keys for the SportsOrca NBA app.
 * It tests the current API key and provides guidance on how to update it.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
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

async function validateApiKey(apiKey, maxRetries = 2, initialDelay = 2000) {
  let lastError;
  let retryCount = 0;
  let delay = initialDelay;
  
  console.log(`${colors.blue}Checking Ball Don't Lie API subscription tier...${colors.reset}`);
  console.log(`${colors.yellow}This will help determine which endpoints are available to you.${colors.reset}`);
  
  while (retryCount <= maxRetries) {
    try {
      if (retryCount === 0) {
        console.log(`${colors.blue}Testing API key...${colors.reset}`);
      } else {
        console.log(`${colors.blue}Retry attempt ${retryCount}/${maxRetries} after ${delay/1000}s delay...${colors.reset}`);
      }
      
      const response = await axios.get(`${API_BASE_URL}/games?per_page=1`, {
        headers: {
          'Authorization': apiKey,
          'Accept': 'application/json',
          'User-Agent': 'SportsOrca/1.0'
        },
        timeout: 10000
      });
      
      if (response.status === 200) {
        console.log(`${colors.green}✓ API key is valid!${colors.reset}`);
        
        // Show rate limit info if available in headers
        if (response.headers['x-ratelimit-remaining']) {
          const remaining = response.headers['x-ratelimit-remaining'];
          const limit = response.headers['x-ratelimit-limit'] || 'unknown';
          console.log(`${colors.blue}Rate limit info: ${remaining}/${limit} requests remaining${colors.reset}`);
        }
        
        return true;
      } else {
        console.log(`${colors.red}✗ API key test failed with status: ${response.status}${colors.reset}`);
        return false;
      }
    } catch (error) {
      lastError = error;
      
      if (error.response && error.response.status === 401) {
        // No need to retry for authentication errors
        console.log(`${colors.red}✗ API key validation failed: Authentication error${colors.reset}`);
        console.log(`${colors.yellow}This appears to be an authentication error. Your API key may be invalid.${colors.reset}`);
        return false;
      } else if (error.response && error.response.status === 429) {
        // Rate limited - try to extract retry-after header
        const retryAfter = error.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
        
        if (retryCount < maxRetries) {
          console.log(`${colors.yellow}Rate limit exceeded. Waiting ${waitTime/1000}s before retry...${colors.reset}`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          delay *= 2; // Exponential backoff
          continue;
        } else {
          console.log(`${colors.red}✗ Rate limit exceeded. Maximum retry attempts reached.${colors.reset}`);
        }
      } else {
        console.log(`${colors.red}✗ API key validation failed: ${error.message}${colors.reset}`);
      }
      
      return false;
    }
  }
  
  return false;
}

async function main() {
  console.log(`\n${colors.magenta}=== SportsOrca NBA API Key Validator ===${colors.reset}\n`);
  
  // Check if API key is set
  if (!process.env.API_KEY) {
    console.log(`${colors.red}✗ No API_KEY found in .env file${colors.reset}`);
    console.log(`${colors.yellow}Please create a .env file based on .env.example and set your API key${colors.reset}`);
    return;
  }
  
  // Validate current API key
  const isValid = await validateApiKey(process.env.API_KEY);
  
  if (!isValid) {
    console.log(`\n${colors.yellow}Suggestions:${colors.reset}`);
    console.log(`1. Check your API key for typos`);
    console.log(`2. Get a new API key from https://www.balldontlie.io/`);
    console.log(`3. Update your .env file with the new key`);
    console.log(`4. If rate limited, wait a few minutes before trying again`);
    console.log(`\n${colors.cyan}For more help, see the API_SETUP.md file in the project root${colors.reset}\n`);
  } else {
    console.log(`\n${colors.green}Your API key is properly configured!${colors.reset}`);
    console.log(`${colors.blue}API quota information:${colors.reset}`);
    console.log(`- Free tier: 60 requests/minute`);
    console.log(`- The app implements retry logic with exponential backoff`);
    console.log(`- Consider implementing additional caching for production use`);
    
    // Provide information about the app's rate limit handling
    console.log(`\n${colors.cyan}Rate Limit Handling:${colors.reset}`);
    console.log(`- Server implements exponential backoff for retries`);
    console.log(`- Client includes automatic retry with status updates`);
    console.log(`- Fallback demo data is provided when API is unavailable`);
  }
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
  process.exit(1);
});
