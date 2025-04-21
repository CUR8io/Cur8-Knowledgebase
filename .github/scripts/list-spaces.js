const { GitBook } = require('@gitbook/api');

// Initialize GitBook client
const gitbook = new GitBook({
  token: process.env.GITBOOK_TOKEN
});

// List all available spaces
async function listSpaces() {
  try {
    const spaces = await gitbook.spaces.list();
    console.log('\nAvailable GitBook Spaces:');
    console.log('------------------------');
    for (const space of spaces) {
      console.log(`Title: ${space.title}`);
      console.log(`ID: ${space.id}`);
      console.log(`URL: ${space.url}`);
      console.log('------------------------');
    }
  } catch (error) {
    console.error('Error listing spaces:', error.message);
    process.exit(1);
  }
}

// Run the space listing
(async () => {
  console.log('Fetching GitBook spaces...');
  await listSpaces();
})(); 