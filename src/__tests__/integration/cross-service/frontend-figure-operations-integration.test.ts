import axios from 'axios';

// Figure Operations Integration Test relocated from fc-frontend
describe('Frontend Figure Operations Integration', () => {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:5055';
  let authToken: string;
  let testFigureId: string;

  beforeAll(async () => {
    console.log('🎭 Starting Frontend Figure Operations Integration Tests');
    
    // Try to get auth token for API calls
    try {
      const loginResponse = await axios.post(`${backendUrl}/auth/login`, {
        email: 'test1@example.com',
        password: 'testpass123'
      });
      authToken = loginResponse.data.data.accessToken;
      console.log('✅ Authentication token obtained');
    } catch (error) {
      console.log('ℹ️  Could not obtain auth token - some tests may be skipped');
      authToken = null;
    }
  });

  const getAuthHeaders = () => ({
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  });

  describe('Figure Creation Integration', () => {
    const testFigure = {
      name: 'Integration Test Figure',
      manufacturer: 'Test Company',
      scale: '1/8',
      location: 'Test Shelf',
      boxNumber: 'Test Box 1'
    };

    it('creates a new figure through backend API integration', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping figure creation test - no auth token');
        return;
      }

      try {
        const response = await axios.post(`${backendUrl}/figures`, testFigure, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        expect(response.status).toBe(201);
        expect(response.data).toHaveProperty('success', true);
        expect(response.data).toHaveProperty('data');
        expect(response.data.data).toHaveProperty('_id');
        expect(response.data.data.name).toBe(testFigure.name);
        expect(response.data.data.manufacturer).toBe(testFigure.manufacturer);
        expect(response.data.data.scale).toBe(testFigure.scale);

        testFigureId = response.data.data._id;
        console.log(`✅ Figure created successfully: ${testFigureId}`);
      } catch (error) {
        console.error('❌ Figure creation failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('validates required fields for figure creation', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping validation test - no auth token');
        return;
      }

      const incompleteFigure = {
        name: 'Incomplete Figure'
        // Missing required fields
      };

      try {
        const response = await axios.post(`${backendUrl}/figures`, incompleteFigure, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        throw new Error('Expected validation error for incomplete figure');
      } catch (error) {
        expect(error.response?.status).toBe(422); // Validation error
        expect(error.response?.data).toHaveProperty('message');
        console.log('✅ Figure validation working correctly');
      }
    });
  });

  describe('Figure Retrieval Integration', () => {
    it('retrieves figure list with pagination', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping figure list test - no auth token');
        return;
      }

      try {
        const response = await axios.get(`${backendUrl}/figures?page=1&limit=10`, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success');
        expect(response.data).toHaveProperty('data');
        expect(response.data).toHaveProperty('total');
        expect(response.data).toHaveProperty('page');
        expect(response.data).toHaveProperty('pages');
        expect(Array.isArray(response.data.data)).toBe(true);

        console.log(`✅ Figure list retrieved: ${response.data.total} figures`);
      } catch (error) {
        console.error('❌ Figure retrieval failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('retrieves specific figure by ID', async () => {
      if (!authToken || !testFigureId) {
        console.log('ℹ️  Skipping figure by ID test - no auth token or test figure');
        return;
      }

      try {
        const response = await axios.get(`${backendUrl}/figures/${testFigureId}`, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('data');
        expect(response.data.data._id).toBe(testFigureId);
        expect(response.data.data.name).toBe('Integration Test Figure');

        console.log(`✅ Figure retrieved by ID: ${testFigureId}`);
      } catch (error) {
        console.error('❌ Figure by ID retrieval failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Figure Search Integration', () => {
    it('performs search with query parameters', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping search test - no auth token');
        return;
      }

      const searchQuery = 'Test';

      try {
        const response = await axios.get(`${backendUrl}/figures/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success');
        expect(response.data).toHaveProperty('data');
        expect(Array.isArray(response.data.data)).toBe(true);

        console.log(`✅ Search performed for "${searchQuery}": ${response.data.data.length} results`);
      } catch (error) {
        if (error.response?.data?.error?.includes('MongoDB Atlas')) {
          console.log('ℹ️  Search requires MongoDB Atlas - skipping in local environment');
          return;
        }
        console.error('❌ Figure search failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('handles empty search results gracefully', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping empty search test - no auth token');
        return;
      }

      const uniqueQuery = `nonexistent_${Date.now()}`;

      try {
        const response = await axios.get(`${backendUrl}/figures/search?query=${encodeURIComponent(uniqueQuery)}`, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('success');
        expect(response.data).toHaveProperty('data');
        expect(response.data.data).toHaveLength(0);

        console.log(`✅ Empty search handled correctly for "${uniqueQuery}"`);
      } catch (error) {
        if (error.response?.data?.error?.includes('MongoDB Atlas')) {
          console.log('ℹ️  Search requires MongoDB Atlas - skipping in local environment');
          return;
        }
        console.error('❌ Empty search handling failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Figure Update Integration', () => {
    it('updates existing figure', async () => {
      if (!authToken || !testFigureId) {
        console.log('ℹ️  Skipping figure update test - no auth token or test figure');
        return;
      }

      const updateData = {
        name: 'Updated Integration Test Figure',
        manufacturer: 'Test Company',
        scale: '1/8',
        location: 'Updated Test Shelf',
        boxNumber: 'Test Box 1'
      };

      try {
        const response = await axios.put(`${backendUrl}/figures/${testFigureId}`, updateData, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('data');
        expect(response.data.data.name).toBe(updateData.name);
        expect(response.data.data.location).toBe(updateData.location);
        expect(response.data.data.manufacturer).toBe(updateData.manufacturer);

        console.log(`✅ Figure updated successfully: ${testFigureId}`);
      } catch (error) {
        console.error('❌ Figure update failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Figure Statistics Integration', () => {
    it('retrieves figure statistics', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping statistics test - no auth token');
        return;
      }

      try {
        const response = await axios.get(`${backendUrl}/figures/stats`, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('data');
        expect(response.data.data).toHaveProperty('totalCount');
        expect(response.data.data).toHaveProperty('manufacturerStats');
        expect(response.data.data).toHaveProperty('scaleStats');
        expect(response.data.data).toHaveProperty('locationStats');
        expect(Array.isArray(response.data.data.manufacturerStats)).toBe(true);
        expect(Array.isArray(response.data.data.scaleStats)).toBe(true);
        expect(Array.isArray(response.data.data.locationStats)).toBe(true);

        console.log(`✅ Statistics retrieved: ${response.data.data.totalCount} total figures`);
      } catch (error) {
        console.error('❌ Statistics retrieval failed:', error.response?.data || error.message);
        throw error;
      }
    });
  });

  describe('Figure Deletion Integration', () => {
    it('deletes existing figure', async () => {
      if (!authToken || !testFigureId) {
        console.log('ℹ️  Skipping figure deletion test - no auth token or test figure');
        return;
      }

      try {
        const response = await axios.delete(`${backendUrl}/figures/${testFigureId}`, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('message');

        console.log(`✅ Figure deleted successfully: ${testFigureId}`);
      } catch (error) {
        console.error('❌ Figure deletion failed:', error.response?.data || error.message);
        throw error;
      }
    });

    it('handles deletion of non-existent figure', async () => {
      if (!authToken) {
        console.log('ℹ️  Skipping non-existent deletion test - no auth token');
        return;
      }

      const fakeId = '507f1f77bcf86cd799439011'; // Valid ObjectId format

      try {
        const response = await axios.delete(`${backendUrl}/figures/${fakeId}`, {
          headers: getAuthHeaders(),
          timeout: 10000
        });

        throw new Error('Expected deletion of non-existent figure to fail');
      } catch (error) {
        expect(error.response?.status).toBe(404);
        console.log('✅ Non-existent figure deletion handled correctly');
      }
    });
  });

  afterAll(() => {
    console.log('🎭 Frontend Figure Operations Integration Tests completed');
  });
});