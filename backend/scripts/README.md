# Backend Scripts and Debug Files

This folder contains debug scripts, test files, and backup files for the Dobara backend.

## Files Overview

### Debug Scripts
- **`debugBillTo.js`** - Debug script for testing BILL TO section parsing
- **`debugPDF.js`** - Debug script for PDF parsing functionality  
- **`debugTextExtraction.js`** - Debug script for text extraction from PDFs
- **`debugTotal.js`** - Debug script for total amount parsing

### Test Scripts
- **`testParser.js`** - Test script for the bill parser functionality

### Backup Files
- **`billParser.js.backup`** - Backup of the original bill parser before refactoring

## Usage

These scripts are standalone debug tools that can be run independently to test specific functionality:

```bash
# Example: Run a debug script
cd backend/scripts
node debugPDF.js

# Example: Test the parser
node testParser.js
```

## Note

These files are for development and debugging purposes only. They are not part of the main application flow and can be safely ignored in production deployments.
