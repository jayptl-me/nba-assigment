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

async function validateApiKey(apiKey) {
  try {
    console.log(`${colors.blue}Testing API key...${colors.reset}`);
    
    const response = await axios.get(`${API_BASE_URL}/games?per_page=1`, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log(`${colors.green}✓ API key is valid!${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}✗ API key test failed with status: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}✗ API key validation failed: ${error.message}${colors.reset}`);
    
    if (error.response && error.response.status === 401) {
      console.log(`${colors.yellow}This appears to be an authentication error. Your API key may be invalid.${colors.reset}`);
    } else if (error.response && error.response.status === 429) {
      console.log(`${colors.yellow}Rate limit exceeded. You may need to wait before trying again.${colors.reset}`);
    }
    
    return false;
  }
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
    console.log(`\n${colors.cyan}For more help, see the API_SETUP.md file in the project root${colors.reset}\n`);
  } else {
    console.log(`\n${colors.green}Your API key is properly configured!${colors.reset}`);
    console.log(`${colors.blue}API quota information:${colors.reset}`);
    console.log(`- Free tier: 60 requests/minute`);
    console.log(`- Consider implementing additional caching for production use`);
  }
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
  process.exit(1);
});
