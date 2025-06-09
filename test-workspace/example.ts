// Test file with intentional TypeScript errors for diagnostic testing

interface User {
  name: string;
  age: number;
}

// Error: Cannot assign string to number (TS2322)
const user: User = {
  name: 'John',
  age: '25', // This should be a number, not a string
};

// Error: Property 'email' does not exist on type 'User' (TS2339)
console.log(user.email);

// Error: Cannot find name 'undefinedVariable' (TS2304)
const result = undefinedVariable + 10;

// Warning: Variable is declared but never used
const unusedVariable = 'This variable is never used';

// Error: Type 'string' is not assignable to type 'number' (TS2322)
function addNumbers(a: number, b: number): number {
  return a + b;
}

const sum = addNumbers('5', 10); // First argument should be number

export { user, result, sum };
