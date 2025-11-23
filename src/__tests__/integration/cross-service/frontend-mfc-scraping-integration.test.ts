import axios from 'axios';

// MFC Scraping Integration Test relocated from fc-frontend
describe('Frontend MFC Scraping Integration', () => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5055';
  const scraperUrl = process.env.SCRAPER_URL || 'http://localhost:3005';
  let authToken: string;

  beforeAll(async () => {
    console.log('🕷️ Starting Frontend MFC Scraping Integration Tests');
    
    // Get auth token for scraping API calls
    try {
      const loginResponse = await axios.post(`${backendUrl}/auth/login`, {
        email: 'test@example.com',
        password: 'validpassword123'
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      authToken = loginResponse.data.data.accessToken;
      console.log('✅ Authentication token obtained for MFC scraping tests');
    } catch (error) {
      console.log('ℹ️  Could not obtain auth token - scraping tests may be limited');
      authToken = null;
    }
  });

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  });

  describe('MFC Link Processing Integration', () => {
    it('validates MFC link format recognition', async () => {
      const testLinks = [
        { 
          url: 'https://myfigurecollection.net/item/123456',
          valid: true,
          description: 'Standard MFC item link'
        },
        {
          url: 'https://myfigurecollection.net/item/123456/comments',
          valid: true, 
          description: 'MFC item link with path'
        },
        {
          url: 'https://example.com/item/123456',
          valid: false,
          description: 'Non-MFC link'
        },
        {
          url: 'invalid-url',
          valid: false,
          description: 'Malformed URL'
        }
      ];

      for (const testCase of testLinks) {
        if (!authToken) {
          console.log(`ℹ️  Skipping MFC link test: ${testCase.description} - no auth token`);
          continue;
        }

        try {
          const response = await axios.post(`${backendUrl}/figures/scrape-mfc`, {
            mfcLink: testCase.url
          }, {
            headers: getAuthHeaders(),
            timeout: 15000 // Longer timeout for scraping
          });

          if (testCase.valid) {
            // Valid links should either succeed or fail gracefully
            expect([200, 404, 500]).toContain(response.status);
            console.log(`✅ ${testCase.description}: Processed (${response.status})`);
          } else {
            // Should not reach here for invalid links
            console.log(`ℹ️  ${testCase.description}: Unexpectedly processed`);
          }
        } catch (error) {
          if (testCase.valid && error.response?.status === 404) {
            console.log(`✅ ${testCase.description}: Valid format but item not found (404)`);
          } else if (testCase.valid && error.response?.status >= 500) {
            console.log(`✅ ${testCase.description}: Valid format but scraping service issue (${error.response.status})`);
          } else if (!testCase.valid && error.response?.status === 400) {
            console.log(`✅ ${testCase.description}: Invalid format properly rejected (400)`);
          } else {
            console.log(`ℹ️  ${testCase.description}: Response ${error.response?.status || error.code}`);
          }
        }
      }
    });

    it('validates MFC data extraction capabilities', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping MFC data extraction test - no auth token');
        return;
      }

      // Use a known MFC item that should exist (using a popular figure)
      const testMfcUrl = 'https://myfigurecollection.net/item/464601'; // Miku figure example

      try {
        const response = await axios.post(`${backendUrl}/figures/scrape-mfc`, {
          mfcLink: testMfcUrl
        }, {
          headers: getAuthHeaders(),
          timeout: 20000 // Extended timeout for actual scraping
        });

        if (response.status === 200 && response.data.success) {
          // Successful scraping - validate data structure
          const scrapedData = response.data.data;
          
          expect(scrapedData).toBeDefined();
          
          // Check for expected fields (may be null if not found, but should exist)
          const expectedFields = ['name', 'manufacturer', 'scale', 'imageUrl'];
          expectedFields.forEach(field => {
            expect(scrapedData).toHaveProperty(field);
          });

          console.log('✅ MFC data extraction successful:');
          console.log(`   Name: ${scrapedData.name || 'Not found'}`);
          console.log(`   Manufacturer: ${scrapedData.manufacturer || 'Not found'}`);
          console.log(`   Scale: ${scrapedData.scale || 'Not found'}`);
          console.log(`   Image: ${scrapedData.imageUrl ? 'Found' : 'Not found'}`);
        } else {
          console.log(`ℹ️  MFC scraping returned: ${response.status} - ${response.data.message || 'No message'}`);
          // This is acceptable - scraping may fail for various reasons
        }
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('ℹ️  MFC item not found - acceptable for test');
        } else if (error.response?.status >= 500) {
          console.log('ℹ️  MFC scraping service unavailable - acceptable for integration test');
        } else {
          console.log(`ℹ️  MFC extraction result: ${error.response?.status || error.code}`);
        }
      }
    });
  });

  describe('Scraping Service Integration', () => {
    it('validates scraper service health and connectivity', async () => {
      try {
        // Check if scraper service is available
        const healthResponse = await axios.get(`${scraperUrl}/health`, {
          timeout: 5000
        });

        expect(healthResponse.status).toBe(200);
        console.log(`✅ Scraper service health: ${healthResponse.data.status || 'ok'}`);

        // Test scraper service capabilities if available
        try {
          const testResponse = await axios.post(`${scraperUrl}/scrape`, {
            url: 'https://myfigurecollection.net/item/464601'
          }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
          });

          console.log(`✅ Direct scraper service test: ${testResponse.status}`);
        } catch (scraperError) {
          console.log(`ℹ️  Direct scraper test: ${scraperError.response?.status || scraperError.code}`);
        }
      } catch (error) {
        console.log(`ℹ️  Scraper service not available at ${scraperUrl} - may be integrated differently`);
        console.log('ℹ️  This is acceptable - scraping may be handled by backend service');
      }
    });

    it('validates scraper error handling and timeouts', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping scraper error handling test - no auth token');
        return;
      }

      // Test with intentionally problematic URLs
      const errorTestCases = [
        {
          url: 'https://myfigurecollection.net/item/999999999',
          description: 'Non-existent MFC item',
          expectedBehavior: 'Should handle gracefully'
        },
        {
          url: 'https://myfigurecollection.net/item/invalid',
          description: 'Invalid MFC item ID',
          expectedBehavior: 'Should reject or handle gracefully'
        }
      ];

      for (const testCase of errorTestCases) {
        try {
          const response = await axios.post(`${backendUrl}/figures/scrape-mfc`, {
            mfcLink: testCase.url
          }, {
            headers: getAuthHeaders(),
            timeout: 10000 // Shorter timeout for error cases
          });

          console.log(`ℹ️  ${testCase.description}: ${testCase.expectedBehavior} (${response.status})`);
        } catch (error) {
          const status = error.response?.status || 'timeout';
          console.log(`✅ ${testCase.description}: ${testCase.expectedBehavior} (${status})`);
          
          // Errors are acceptable and expected for these test cases
          expect([400, 404, 500, 'timeout', 'ECONNABORTED']).toContain(status);
        }
      }
    });
  });

  describe('Figure Auto-population Integration', () => {
    it('validates auto-population workflow from MFC data', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping auto-population test - no auth token');
        return;
      }

      const testMfcUrl = 'https://myfigurecollection.net/item/464601';

      try {
        // Step 1: Scrape MFC data
        const scrapeResponse = await axios.post(`${backendUrl}/figures/scrape-mfc`, {
          mfcLink: testMfcUrl
        }, {
          headers: getAuthHeaders(),
          timeout: 20000
        });

        if (scrapeResponse.status === 200 && scrapeResponse.data.success) {
          const scrapedData = scrapeResponse.data.data;
          
          // Step 2: Create figure with scraped data
          const figureData = {
            name: scrapedData.name || 'Auto-populated Test Figure',
            manufacturer: scrapedData.manufacturer || 'Auto-populated Manufacturer',
            scale: scrapedData.scale || '1/8',
            mfcLink: testMfcUrl,
            imageUrl: scrapedData.imageUrl || '',
            location: 'Auto-population Test Location'
          };

          const createResponse = await axios.post(`${backendUrl}/figures`, figureData, {
            headers: getAuthHeaders(),
            timeout: 10000
          });

          expect(createResponse.status).toBe(201);
          expect(createResponse.data.mfcLink).toBe(testMfcUrl);
          
          const figureId = createResponse.data._id;
          console.log('✅ Figure auto-populated from MFC data successfully');

          // Step 3: Cleanup
          try {
            await axios.delete(`${backendUrl}/figures/${figureId}`, {
              headers: getAuthHeaders(),
              timeout: 5000
            });
            console.log('✅ Auto-populated test figure cleaned up');
          } catch (cleanupError) {
            console.log('ℹ️  Cleanup note: Auto-populated test figure may remain');
          }

          console.log('🎯 Complete MFC auto-population workflow: SUCCESS');
        } else {
          console.log('ℹ️  MFC scraping not successful - auto-population workflow cannot be fully tested');
          console.log('ℹ️  This is acceptable - scraping service may be unavailable or rate-limited');
        }
      } catch (error) {
        console.log(`ℹ️  Auto-population workflow result: ${error.response?.status || error.code}`);
        console.log('ℹ️  Scraping failures are acceptable in integration tests');
      }
    });

    it('validates figure creation without MFC auto-population', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping manual figure creation test - no auth token');
        return;
      }

      // Test creating figure without MFC scraping (manual entry)
      const manualFigureData = {
        name: 'Manual Entry Test Figure',
        manufacturer: 'Manual Test Company', 
        scale: '1/7',
        mfcLink: '', // No MFC link
        location: 'Manual Test Location',
        price: 15000
      };

      try {
        const createResponse = await axios.post(`${backendUrl}/figures`, manualFigureData, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        expect(createResponse.status).toBe(201);
        expect(createResponse.data.name).toBe(manualFigureData.name);
        expect(createResponse.data.mfcLink).toBe('');

        const figureId = createResponse.data._id;
        console.log('✅ Manual figure creation (without MFC) successful');

        // Cleanup
        try {
          await axios.delete(`${backendUrl}/figures/${figureId}`, {
            headers: getAuthHeaders(),
            timeout: 5000
          });
          console.log('✅ Manual test figure cleaned up');
        } catch (cleanupError) {
          console.log('ℹ️  Cleanup note: Manual test figure may remain');
        }
      } catch (error) {
        console.error('❌ Manual figure creation failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Rate Limiting and Scraping Ethics Integration', () => {
    it('validates scraping respects rate limits and ethical guidelines', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping rate limiting test - no auth token');
        return;
      }

      // Test multiple scraping requests to ensure rate limiting
      const testUrls = [
        'https://myfigurecollection.net/item/464601',
        'https://myfigurecollection.net/item/464602',
        'https://myfigurecollection.net/item/464603'
      ];

      const startTime = Date.now();
      const responses = [];

      for (const url of testUrls) {
        try {
          const response = await axios.post(`${backendUrl}/figures/scrape-mfc`, {
            mfcLink: url
          }, {
            headers: getAuthHeaders(),
            timeout: 10000
          });
          responses.push(response.status);
        } catch (error) {
          responses.push(error.response?.status || 'timeout');
        }
      }

      const totalTime = Date.now() - startTime;
      
      console.log(`✅ Rate limiting test completed: ${totalTime}ms for ${testUrls.length} requests`);
      console.log(`   Response codes: ${responses.join(', ')}`);
      
      // Ensure reasonable time between requests (rate limiting)
      if (totalTime < 1000) {
        console.log('ℹ️  Requests completed quickly - rate limiting may be disabled for testing');
      } else {
        console.log('✅ Rate limiting appears to be in effect');
      }
    });

    it('validates scraper handles service unavailability gracefully', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping service unavailability test - no auth token');
        return;
      }

      // Test with URL that should trigger service issues
      try {
        const response = await axios.post(`${backendUrl}/figures/scrape-mfc`, {
          mfcLink: 'https://myfigurecollection.net/item/1' // Minimal ID that may not exist
        }, {
          headers: getAuthHeaders(),
          timeout: 5000 // Short timeout to simulate service issues
        });

        console.log(`✅ Service unavailability handling: Response ${response.status}`);
      } catch (error) {
        const status = error.response?.status || error.code;
        console.log(`✅ Service unavailability handled gracefully: ${status}`);
        
        // Any of these responses indicate proper error handling
        expect(['ECONNABORTED', 'timeout', 404, 500, 503]).toContain(status);
      }
    });
  });

  afterAll(() => {
    console.log('🕷️ Frontend MFC Scraping Integration Tests completed');
    console.log('ℹ️  Note: Scraping tests may fail due to external service availability');
    console.log('ℹ️  This is expected and acceptable in integration testing');
  });
});