#!/usr/bin/env node

/**
 * Simple test script for MCP server functionality
 */

const { spawn } = require('child_process');

async function testMcpServer() {
  console.log('🧪 Testing MCP Server with proper handshake...\n');

  const serverProcess = spawn('node', ['scripts/mcp-server.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: __dirname
  });

  let messageId = 1;

  // Collect responses
  const responses = [];

  serverProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        console.log('📨 Received:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('📝 Server log:', line);
      }
    }
  });

  serverProcess.stderr.on('data', (data) => {
    console.log('⚠️ Server stderr:', data.toString());
  });

  // Helper function to send messages
  function send(message) {
    console.log('📤 Sending:', JSON.stringify(message));
    serverProcess.stdin.write(JSON.stringify(message) + '\n');
  }

  // Wait a bit for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // 1. Initialize
    send({
      jsonrpc: '2.0',
      id: messageId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    });

    // Wait for initialize response
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 2. Send initialized notification
    send({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. List tools
    send({
      jsonrpc: '2.0',
      id: messageId++,
      method: 'tools/list'
    });

    // Wait for tools list
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Call getProblems tool
    send({
      jsonrpc: '2.0',
      id: messageId++,
      method: 'tools/call',
      params: {
        name: 'getProblems',
        arguments: {}
      }
    });

    // Wait for tool response
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n✅ Test completed! Check responses above.');

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    serverProcess.kill();
  }
}

testMcpServer().catch(console.error);
