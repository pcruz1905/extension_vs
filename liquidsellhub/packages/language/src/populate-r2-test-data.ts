/**
 * Script to populate R2 bucket with test component data
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { R2Config, ComponentManifest, ComponentMetadata } from './types/index.js';

const config: R2Config = {
    r2AccountId: '214035a0def0c733a95a615eabbb31e1',
    r2AccessKeyId: 'bd97fbe580808c3db295feb9ab66f141',
    r2SecretAccessKey: '5afc7cd01a55a6f55d86f3107d2a763884dff86aac5e97b4a27c6795a695fbb5',
    r2BucketName: 'sellhub-test-themes',
};

async function populateTestData() {
    console.log('='.repeat(80));
    console.log('📦 [POPULATE] Populating R2 with test data...');
    console.log('='.repeat(80));
    console.log();

    // Check for proxy configuration
    const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY;
    if (proxyUrl) {
        console.log('🌐 [POPULATE] Proxy detected:', proxyUrl.substring(0, 50) + '...');
    }

    const s3Config: any = {
        endpoint: `https://${config.r2AccountId}.r2.cloudflarestorage.com`,
        region: 'auto',
        credentials: {
            accessKeyId: config.r2AccessKeyId,
            secretAccessKey: config.r2SecretAccessKey,
        },
        forcePathStyle: true,
    };

    // Add proxy support if proxy is configured
    if (proxyUrl) {
        console.log('🔧 [POPULATE] Configuring proxy agent...');
        const proxyAgent = new HttpsProxyAgent(proxyUrl);
        s3Config.requestHandler = new NodeHttpHandler({
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
        });
        console.log('✅ [POPULATE] Proxy agent configured');
    }

    const s3Client = new S3Client(s3Config);

    // Create test components
    const testComponents = ['ProductCard', 'CartButton', 'Header'];

    // Create manifest
    const manifest: ComponentManifest = {
        components: testComponents,
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
    };

    console.log('📝 [POPULATE] Creating manifest...');
    console.log('  Components:', testComponents.join(', '));
    console.log();

    try {
        // Upload manifest
        const manifestCommand = new PutObjectCommand({
            Bucket: config.r2BucketName,
            Key: 'components:manifest',
            Body: JSON.stringify(manifest, null, 2),
            ContentType: 'application/json',
        });

        await s3Client.send(manifestCommand);
        console.log('✅ [POPULATE] Manifest uploaded successfully');
        console.log();

        // Upload metadata for each component
        for (const componentName of testComponents) {
            console.log(`📝 [POPULATE] Creating metadata for ${componentName}...`);

            const metadata: ComponentMetadata = {
                name: componentName,
                description: `Test ${componentName} component for Islands`,
                props: {
                    title: {
                        type: 'string',
                        required: true,
                        description: `Title for the ${componentName}`,
                    },
                    variant: {
                        type: 'string',
                        required: false,
                        description: 'Visual variant',
                        default: 'default',
                    },
                    onClick: {
                        type: 'function',
                        required: false,
                        description: 'Click handler',
                    },
                },
            };

            const metadataCommand = new PutObjectCommand({
                Bucket: config.r2BucketName,
                Key: `component:${componentName}:metadata`,
                Body: JSON.stringify(metadata, null, 2),
                ContentType: 'application/json',
            });

            await s3Client.send(metadataCommand);
            console.log(`✅ [POPULATE] Metadata for ${componentName} uploaded`);
        }

        console.log();
        console.log('='.repeat(80));
        console.log('🎉 [POPULATE] All test data uploaded successfully!');
        console.log('='.repeat(80));
        console.log();
        console.log('📊 [POPULATE] Summary:');
        console.log('  Manifest: components:manifest');
        console.log('  Components:', testComponents.length);
        for (const comp of testComponents) {
            console.log(`    - component:${comp}:metadata`);
        }
        console.log('='.repeat(80));

    } catch (error) {
        console.error();
        console.error('='.repeat(80));
        console.error('❌ [POPULATE] Failed to upload test data');
        console.error('='.repeat(80));
        console.error('Error:', error);
        if (error instanceof Error) {
            console.error('  Message:', error.message);
            console.error('  Stack:', error.stack);
        }
        process.exit(1);
    }
}

console.log('🚀 [POPULATE] Starting population of R2 test data...');
console.log();

populateTestData();
