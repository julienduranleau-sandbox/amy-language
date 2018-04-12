AmyTests.run('tests.txt')
AmyTranspiler.transpile('../samples/test1.amy').then(result => {
    document.getElementById('amy').innerText = result.amySource
    document.getElementById('js').innerText = result.jsSource
})
