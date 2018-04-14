AmyTests.run('tests.txt')

AmyTranspiler.transpile('../samples/test1.amy').then(result => {
    document.querySelector('#amy').innerText = result.amySource
    document.querySelector('#js').innerText = result.jsSource
})

document.querySelector('.runBt').addEventListener('click', function() {
    let js = document.querySelector('#js').innerText
    eval(js)
})
