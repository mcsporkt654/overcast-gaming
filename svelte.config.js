import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    // Keep API paths identical to the old Express routes
    paths: {
      base: ''
    }
  }
};

export default config;
