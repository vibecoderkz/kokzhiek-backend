const request = require('supertest');
const dotenv = require('dotenv');

// Load test environment
dotenv.config({ path: '.env.test' });

async function testLogin() {
  try {
    const app = require('./dist/app.js').default;

    console.log('Testing login with real credentials...');
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'balinteegor@gmail.com',
        password: 'Tomiris2004!'
      });

    console.log('Login response status:', response.status);
    console.log('Login response body:', JSON.stringify(response.body, null, 2));

    if (response.status === 200) {
      const token = response.body.data.token;
      console.log('\nTesting book creation...');

      const bookResponse = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Debug Test Book'
        });

      console.log('Book creation response status:', bookResponse.status);
      console.log('Book creation response body:', JSON.stringify(bookResponse.body, null, 2));
    }

  } catch (error) {
    console.error('Error during test:', error);
  }
}

testLogin();