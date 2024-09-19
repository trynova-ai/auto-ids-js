# auto-ids-js
Automatically inject ids into elements at runtime

## Installation

To use the Auto Ids package, install the package and initialize it in your application:

```bash
npm install @trynova-ai/auto-ids-js
```

## Basic Usage

```javascript
import testDataIdObserver from '@trynova-ai/auto-ids-js';

// Initialize the MutationObserver
const observer = testDataIdObserver();

// The observer will now monitor the DOM and assign 'data-testid' attributes
// to new 'input', 'button', and 'a' elements as they are added.
```

## License

[Apache License 2.0](LICENSE)
