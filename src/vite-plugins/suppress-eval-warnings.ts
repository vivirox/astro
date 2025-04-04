/**
 * Vite plugin to suppress eval warnings for specific modules
 * This plugin suppresses the eval warning for the flexsearch module
 * which uses eval in its worker implementation
 */
export default function suppressEvalWarnings() {
  return {
    name: 'suppress-eval-warnings',
    enforce: 'pre',
    handleHotUpdate({ file, modules }) {
      // Continue with hot update
      return modules;
    },
    transform(code: string, id: string) {
      // Only apply to flexsearch worker files
      if (id.includes('flexsearch/dist/module/worker')) {
        // Replace eval with Function constructor which is slightly safer
        // and avoids the Vite warning about eval usage
        return code.replace(
          /return eval\(\"\(\"\s*\+\s*obj\.toString\(\)\s*\+\s*\"\)\"\);/g,
          'return new Function("return (" + obj.toString() + ")")();'
        );
      }
      
      return null; // Return null to let other plugins process the file
    }
  };
} 