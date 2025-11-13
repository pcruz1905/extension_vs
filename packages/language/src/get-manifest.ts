/**
 * Simple script to fetch manifest from R2
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { HttpsProxyAgent } from 'https-proxy-agent';

const config = {
    r2AccountId: '214035a0def0c733a95a615eabbb31e1',
    r2AccessKeyId: 'bd97fbe580808c3db295feb9ab66f141',
    r2SecretAccessKey: '5afc7cd01a55a6f55d86f3107d2a763884dff86aac5e97b4a27c6795a695fbb5',
    r2BucketName: 'sellhub-test-themes',
};

async function getManifest() {
    console.log('='.repeat(80));
    console.log('📥 [GET-MANIFEST] Fetching manifest from R2...');
    console.log('='.repeat(80));
    console.log();

    // Check for proxy configuration
    const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY;
    if (proxyUrl) {
        console.log('🌐 [GET-MANIFEST] Proxy detected:', proxyUrl.substring(0, 50) + '...');
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
        console.log('🔧 [GET-MANIFEST] Configuring proxy agent...');
        const proxyAgent = new HttpsProxyAgent(proxyUrl);
        s3Config.requestHandler = new NodeHttpHandler({
            httpAgent: proxyAgent,
            httpsAgent: proxyAgent,
        });
        console.log('✅ [GET-MANIFEST] Proxy agent configured');
    }

    const s3Client = new S3Client(s3Config);

    try {
        console.log('📤 [GET-MANIFEST] Fetching components:manifest from bucket:', config.r2BucketName);

        const command = new GetObjectCommand({
            Bucket: config.r2BucketName,
            Key: 'components:manifest',
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
            console.error('❌ [GET-MANIFEST] No body in response');
            return;
        }

        const bodyString = await response.Body.transformToString();

        console.log();
        console.log('='.repeat(80));
        console.log('✅ [GET-MANIFEST] Successfully fetched manifest!');
        console.log('='.repeat(80));
        console.log();
        console.log('📄 [GET-MANIFEST] Manifest content:');
        console.log(bodyString);
        console.log();
        console.log('='.repeat(80));

        // Parse and display
        try {
            const manifest = JSON.parse(bodyString);
            console.log('📊 [GET-MANIFEST] Parsed manifest:');
            console.log('  Version:', manifest.version);
            console.log('  Generated at:', manifest.generatedAt);
            console.log('  Components:', manifest.components ? manifest.components.join(', ') : 'none');
            console.log('  Total components:', manifest.components ? manifest.components.length : 0);
        } catch (e) {
            console.log('⚠️ [GET-MANIFEST] Could not parse as JSON');
        }

    } catch (error: any) {
        console.log();
        console.error('='.repeat(80));
        console.error('❌ [GET-MANIFEST] Failed to fetch manifest');
        console.error('='.repeat(80));
        console.error('Error:', error.message);
        console.error('Code:', error.Code || error.code);

        if (error.Code === 'NoSuchKey' || error.message.includes('NoSuchKey')) {
            console.error();
            console.error('💡 [GET-MANIFEST] The manifest file does not exist in the bucket.');
            console.error('💡 [GET-MANIFEST] The bucket exists but is empty or the key "components:manifest" was not found.');
        } else if (error.Code === 'NoSuchBucket' || error.message.includes('NoSuchBucket')) {
            console.error();
            console.error('💡 [GET-MANIFEST] The bucket "sellhub-test" does not exist.');
            console.error('💡 [GET-MANIFEST] Please create the bucket in Cloudflare R2 dashboard.');
        }
    }
}

getManifest();
