// Test file with intentional ESLint errors and warnings

// ESLint: no-unused-vars
const unusedVar = "This variable is never used";

// ESLint: no-undef
console.log(undefinedGlobal);

// ESLint: no-console (if configured)
console.log("Debug message");

// ESLint: prefer-const
let shouldBeConst = "This should be const";

// ESLint: no-var
var oldStyleVar = "Should use let or const";

// ESLint: eqeqeq
if (shouldBeConst == "test") {
  console.log("Should use === instead of ==");
}

// ESLint: no-trailing-spaces
const withTrailingSpaces = "text";

// ESLint: semi
const missingSemicolon = "missing semicolon"

// ESLint: quotes (if configured for single quotes)
const wrongQuotes = "should be single quotes";

function testFunction() {
  // ESLint: no-unreachable
  return true;
  console.log("This code is unreachable");
}

module.exports = { testFunction };
