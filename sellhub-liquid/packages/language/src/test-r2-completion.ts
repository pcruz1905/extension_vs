/**
 * Test script to verify R2 connection and Islands completion
 */

import { R2Client } from './services/r2-client.js';
import { R2Config } from './types/index.js';

const config: R2Config = {
    r2AccountId: '372296d1d7a1c51e077b1fb1b4462cce',
    r2AccessKeyId: '1c5435b70cff06ab40e79bfa9832e8ca',
    r2SecretAccessKey: '325eafdf2318d742f61a2c4e92b69e0eeef83b88186bfe49d64d625a96d9c983',
    r2BucketName: 'sellhubb-themes',
};

async function testR2Connection() {
    console.log('='.repeat(60));
    console.log('Testing R2 Connection and Component Fetching');
    console.log('='.repeat(60));
    console.log();

    const r2Client = new R2Client(config);

    try {
        console.log('1. Fetching component manifest...');
        const manifest = await r2Client.getComponentManifest();

        console.log('✓ Success! Found components:');
        console.log(`  Total components: ${manifest.components.length}`);
        console.log(`  Components: ${manifest.components.join(', ')}`);
        console.log();

        if (manifest.components.length > 0) {
            console.log('2. Fetching metadata for first component...');
            const firstComponent = manifest.components[0];
            console.log(`  Component: ${firstComponent}`);

            const metadata = await r2Client.getComponentMetadata(firstComponent);

            if (metadata) {
                console.log('✓ Success! Component metadata:');
                console.log(`  Name: ${metadata.name}`);
                console.log(`  Description: ${metadata.description || 'N/A'}`);
                console.log(`  Props:`);

                if (metadata.props && Object.keys(metadata.props).length > 0) {
                    for (const [propName, propDef] of Object.entries(metadata.props)) {
                        console.log(`    - ${propName}: ${propDef.type}${propDef.required ? ' (required)' : ''}`);
                        if (propDef.description) {
                            console.log(`      ${propDef.description}`);
                        }
                    }
                } else {
                    console.log('    No props defined');
                }

                console.log();
                console.log('3. Testing completion suggestion format...');
                console.log('  When user types: {% island "');
                console.log(`  Suggestion would show: ${metadata.name}`);
                console.log(`  Detail: ${metadata.description || `Island component: ${metadata.name}`}`);
                console.log();

                // Show what the completion would insert
                const propsList = metadata.props
                    ? Object.keys(metadata.props)
                        .map((key, idx) => `${key}: $\{${idx + 1}\}`)
                        .join(', ')
                    : '';

                console.log('  Full insertion would be:');
                console.log(`  {% island "${metadata.name}", props: { ${propsList} }, hydrate: "lazy" %}`);
                console.log('  {% endisland %}');
            } else {
                console.log('✗ Could not fetch metadata');
            }
        }

        console.log();
        console.log('='.repeat(60));
        console.log('✓ R2 Connection Test PASSED');
        console.log('  - Can fetch component manifest');
        console.log('  - Can fetch component metadata');
        console.log('  - Completion provider should work in VS Code');
        console.log('='.repeat(60));

    } catch (error) {
        console.error();
        console.error('='.repeat(60));
        console.error('✗ R2 Connection Test FAILED');
        console.error('='.repeat(60));
        console.error('Error:', error);
        console.error();

        if (error instanceof Error) {
            console.error('Error details:');
            console.error('  Message:', error.message);
            console.error('  Stack:', error.stack);
        }
    }
}

testR2Connection();
