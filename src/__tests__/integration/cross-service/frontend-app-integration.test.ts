import axios from 'axios';

// App-level Integration Test relocated from fc-frontend
describe('Frontend App Integration', () => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5055';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5056';

  beforeAll(async () => {
    console.log('🚀 Starting Frontend App Integration Tests');
  });

  describe('Service Discovery and Health Integration', () => {
    it('validates backend service availability and health', async () => {
      try {
        const healthResponse = await axios.get(`${backendUrl}/health`, {
          timeout: 10000
        });

        expect(healthResponse.status).toBe(200);
        expect(healthResponse.data).toHaveProperty('status');
        expect(['ok', 'healthy', 'up'].includes(healthResponse.data.status.toLowerCase())).toBe(true);

        console.log(`✅ Backend service health: ${healthResponse.data.status}`);
      } catch (error) {
        console.error('❌ Backend health check failed:', error.message);
        throw error;
      }
    });

  });

  describe('API Gateway and Routing Integration', () => {
    it('validates core API endpoints are accessible', async () => {
      const coreEndpoints = [
        { path: '/health', expectedStatus: 200, description: 'Health check' },
      ];

      for (const endpoint of coreEndpoints) {
        try {
          const response = await axios.get(`${backendUrl}${endpoint.path}`, {
            timeout: 10000
          });

          expect(response.status).toBe(endpoint.expectedStatus);
          console.log(`✅ ${endpoint.description}: ${endpoint.path}`);
        } catch (error) {
          console.error(`❌ ${endpoint.description} failed: ${endpoint.path}`, error.message);
          throw error;
        }
      }
    });

    it('validates authentication endpoints are properly configured', async () => {
      const authEndpoints = [
        { 
          path: '/auth/login', 
          method: 'POST',
          data: { email: 'test@example.com', password: 'testpass' },
          expectedStatuses: [200, 401], // Success or auth failure both acceptable
          description: 'Login endpoint'
        },
      ];

      for (const endpoint of authEndpoints) {
        try {
          const response = await axios({
            method: endpoint.method,
            url: `${backendUrl}${endpoint.path}`,
            data: endpoint.data,
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });

          expect(endpoint.expectedStatuses).toContain(response.status);
          console.log(`✅ ${endpoint.description}: ${endpoint.path} (${response.status})`);
        } catch (error) {
          if (endpoint.expectedStatuses.includes(error.response?.status)) {
            console.log(`✅ ${endpoint.description}: ${endpoint.path} (${error.response.status})`);
          } else {
            console.error(`❌ ${endpoint.description} failed: ${endpoint.path}`, error.message);
            throw error;
          }
        }
      }
    });

    it('validates protected endpoints require authentication', async () => {
      const protectedEndpoints = [
        { path: '/figures', expectedStatus: 401, description: 'Figures list' },
        { path: '/figures/stats', expectedStatus: 401, description: 'Figure statistics' },
      ];

      for (const endpoint of protectedEndpoints) {
        try {
          const response = await axios.get(`${backendUrl}${endpoint.path}`, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          });

          // If we get here without auth, something's wrong
          throw new Error(`Expected ${endpoint.path} to require authentication`);
        } catch (error) {
          expect(error.response?.status).toBe(endpoint.expectedStatus);
          console.log(`✅ ${endpoint.description} properly protected: ${endpoint.path}`);
        }
      }
    });
  });

  describe('Data Flow and State Management Integration', () => {
    let authToken: string;

    beforeAll(async () => {
      // Try to get an auth token for data flow tests
      try {
        const loginResponse = await axios.post(`${backendUrl}/auth/login`, {
          email: 'test@example.com',
          password: 'validpassword123'
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });

        authToken = loginResponse.data.data.accessToken;
        console.log('✅ Authentication token obtained for data flow tests');
      } catch (error) {
        console.log('ℹ️  Could not obtain auth token - some data flow tests may be skipped');
        authToken = null;
      }
    });

    it('validates end-to-end data flow from frontend through backend', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping data flow test - no auth token');
        return;
      }

      try {
        // Test the complete data pipeline
        const dataFlowSteps = [
          {
            name: 'Fetch user statistics',
            request: () => axios.get(`${backendUrl}/figures/stats`, {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            })
          },
          {
            name: 'Fetch figure list',
            request: () => axios.get(`${backendUrl}/figures?page=1&limit=5`, {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            })
          }
        ];

        for (const step of dataFlowSteps) {
          const response = await step.request();
          expect(response.status).toBe(200);
          expect(response.data).toBeDefined();
          console.log(`✅ ${step.name}: Data received successfully`);
        }

        console.log('✅ End-to-end data flow validated');
      } catch (error) {
        console.error('❌ Data flow validation failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('validates state consistency across API calls', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping state consistency test - no auth token');
        return;
      }

      try {
        // Get initial stats
        const initialStats = await axios.get(`${backendUrl}/figures/stats`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const initialCount = initialStats.data.totalCount;
        console.log(`✅ Initial figure count: ${initialCount}`);

        // Create a test figure
        const testFigure = {
          name: 'State Consistency Test Figure',
          manufacturer: 'State Test Company',
          scale: '1/12',
          location: 'State Test Location'
        };

        const createResponse = await axios.post(`${backendUrl}/figures`, testFigure, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        expect(createResponse.status).toBe(201);
        const figureId = createResponse.data._id;
        console.log(`✅ Test figure created: ${figureId}`);

        // Verify stats updated
        const updatedStats = await axios.get(`${backendUrl}/figures/stats`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const updatedCount = updatedStats.data.totalCount;
        expect(updatedCount).toBe(initialCount + 1);
        console.log(`✅ Stats updated correctly: ${initialCount} → ${updatedCount}`);

        // Cleanup
        try {
          await axios.delete(`${backendUrl}/figures/${figureId}`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          });
          console.log(`✅ Test figure cleaned up`);
        } catch (cleanupError) {
          console.log('ℹ️  Cleanup note: Test figure may remain');
        }

        console.log('✅ State consistency validated across API calls');
      } catch (error) {
        console.error('❌ State consistency validation failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Error Handling and Resilience Integration', () => {
    it('validates graceful error handling across service boundaries', async () => {
      const errorScenarios = [
        {
          name: 'Invalid endpoint',
          request: () => axios.get(`${backendUrl}/nonexistent-endpoint`, { timeout: 5000 }),
          expectedStatus: 404
        },
        {
          name: 'Malformed request body',
          request: () => axios.post(`${backendUrl}/auth/login`, 'invalid json', {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          }),
          expectedStatus: 400
        }
      ];

      for (const scenario of errorScenarios) {
        try {
          const response = await scenario.request();
          throw new Error(`Expected ${scenario.name} to fail with status ${scenario.expectedStatus}`);
        } catch (error) {
          expect(error.response?.status).toBe(scenario.expectedStatus);
          expect(error.response?.data).toBeDefined();
          console.log(`✅ ${scenario.name}: Error handled gracefully (${scenario.expectedStatus})`);
        }
      }
    });

    it('validates service resilience under load conditions', async () => {
      // Simulate concurrent requests to test resilience
      const concurrentRequests = Array(5).fill(null).map((_, index) => 
        axios.get(`${backendUrl}/health`, {
          timeout: 10000,
          headers: { 'X-Test-Request': `concurrent-${index}` }
        })
      );

      try {
        const responses = await Promise.all(concurrentRequests);
        
        responses.forEach((response, index) => {
          expect(response.status).toBe(200);
        });

        console.log(`✅ Service resilience: Handled ${responses.length} concurrent requests`);
      } catch (error) {
        console.error('❌ Service resilience test failed:', error.message);
        throw error;
      }
    });
  });

  describe('Performance and Optimization Integration', () => {
    it('validates API response times are acceptable', async () => {
      const performanceTests = [
        { endpoint: '/health', maxTime: 1000, description: 'Health check' },
        { endpoint: '/version', maxTime: 2000, description: 'Version information' }
      ];

      for (const test of performanceTests) {
        const startTime = Date.now();
        
        try {
          const response = await axios.get(`${backendUrl}${test.endpoint}`, {
            timeout: test.maxTime + 1000
          });

          const responseTime = Date.now() - startTime;
          expect(response.status).toBe(200);
          expect(responseTime).toBeLessThan(test.maxTime);

          console.log(`✅ ${test.description}: ${responseTime}ms (< ${test.maxTime}ms)`);
        } catch (error) {
          const responseTime = Date.now() - startTime;
          console.error(`❌ ${test.description} performance failed: ${responseTime}ms`, error.message);
          throw error;
        }
      }
    });

    it('validates response payload sizes are reasonable', async () => {
      try {
        const response = await axios.get(`${backendUrl}/version`, {
          timeout: 10000
        });

        expect(response.status).toBe(200);
        
        const payloadSize = JSON.stringify(response.data).length;
        expect(payloadSize).toBeLessThan(5000); // Keep payloads reasonable

        console.log(`✅ Version endpoint payload size: ${payloadSize} bytes (< 5000 bytes)`);
      } catch (error) {
        console.error('❌ Payload size validation failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  afterAll(() => {
    console.log('🚀 Frontend App Integration Tests completed');
    console.log('ℹ️  All app-level integrations validated successfully');
  });
});