#!/usr/bin/env node

/**
 * Test script to verify MCP tools work correctly
 * This simulates how Cursor would interact with our MCP server
 */

const { spawn } = require('child_process');
const path = require('path');

// Test requests for our MCP tools
const testRequests = [
  {
    name: 'getProblems',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'getProblems',
        arguments: {}
      }
    }
  },
  {
    name: 'getWorkspaceSummary',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'getWorkspaceSummary',
        arguments: {}
      }
    }
  },
  {
    name: 'getProblemsForFile',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'getProblemsForFile',
        arguments: {
          filePath: path.join(__dirname, 'src/extension.ts')
        }
      }
    }
  }
];

async function testMcpTools() {
  console.log('🧪 Testing MCP Tools...\n');

  for (const test of testRequests) {
    console.log(`📋 Testing ${test.name}...`);

    try {
      const result = await sendMcpRequest(test.request);

      if (result.error) {
        console.log(`❌ ${test.name} failed:`, result.error);
      } else {
        console.log(`✅ ${test.name} succeeded`);

        // Parse the response content
        const content = result.result?.content?.[0]?.text;
        if (content) {
          const data = JSON.parse(content);
          console.log(`   📊 Response summary:`, {
            type: typeof data,
            keys: Object.keys(data),
            problemCount: data.problems?.length || data.count || 'N/A'
          });
        }
      }
    } catch (error) {
      console.log(`💥 ${test.name} crashed:`, error.message);
    }

    console.log(''); // Empty line for readability
  }
}

function sendMcpRequest(request) {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('node', ['scripts/mcp-server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: __dirname
    });

    let stdout = '';
    let stderr = '';

    serverProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    serverProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    serverProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Server exited with code ${code}. Stderr: ${stderr}`));
        return;
      }

      // Parse the last JSON response from stdout
      const lines = stdout.split('\n').filter(line => line.trim());
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const response = JSON.parse(lines[i]);
          if (response.id === request.id) {
            resolve(response);
            return;
          }
        } catch (e) {
          // Not JSON, continue
        }
      }

      reject(new Error('No valid JSON response found'));
    });

    // Send request to server
    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    serverProcess.stdin.end();

    // Timeout after 10 seconds
    setTimeout(() => {
      serverProcess.kill();
      reject(new Error('Test timeout'));
    }, 10000);
  });
}

// Run the test
testMcpTools()
  .then(() => {
    console.log('🎉 MCP Tools test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 MCP Tools test failed:', error);
    process.exit(1);
  });
