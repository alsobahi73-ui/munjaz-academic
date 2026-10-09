const gpaResult = document.getElementById('gpaResult');
const ssResult = document.getElementById('ssResult');
const wcWords = document.getElementById('wcWords');
const unitOutput = document.getElementById('unitOutputResult');
console.log('TEST_GPA_INIT: ' + (gpaResult ? 'OK' : 'FAIL'));
console.log('TEST_SS_INIT: ' + (ssResult ? 'OK' : 'FAIL'));
console.log('TEST_WC_INIT: ' + (wcWords ? 'OK' : 'FAIL'));
console.log('TEST_UNIT_INIT: ' + (unitOutput ? unitOutput.textContent : 'FAIL'));