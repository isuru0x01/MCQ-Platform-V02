import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

// Initialize the client with API key
lemonSqueezySetup({
	apiKey: process.env.LEMON_SQUEEZY_API_KEY!,
	onError: (error) => {
		console.error('LemonSqueezy Error:', error);
	}
});

// Export the initialized createCheckout function
export { createCheckout };