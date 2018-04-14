class AmyTests {

    static run(testFile, start, end) {
        fetch(testFile).then(req => req.text()).then(text => {
            // convert crlf to lf if necessary
            text = text.replace(/\r\n/gm, '\n')

            let rawTests = text.split(/###+\n/g)
            let tests = rawTests.map((test) => {
                let parts = test.split(/---+\n/g)
                if (parts[0] && parts[1]) {
                    return {
                        from: parts[0],
                        to: parts[1]
                    }
                }
            })

            // remove empty tests
            for (let i = tests.length - 1; i >= 0; i--) {
                if (tests[i] === undefined) {
                    tests.splice(i, 1)
                }
            }

            if (!start) start = 0
            if (!end) end = tests.length - 1

            tests = tests.splice(start, end)

            this.runTests(tests)
        })
    }

    static runTests(tests) {
        let errorsFound = []
        let transpiler = new AmyTranspiler()

        tests.forEach((test, i) => {
            let transpiled = transpiler.parse(test.from)

            if (transpiled !== test.to) {
                errorsFound.push({
                    index: i,
                    from: test.from,
                    to: test.to,
                    result: transpiled
                })
            }
        })

        if (errorsFound.length) {
            let errorWord = (errorsFound.length > 1) ? 'errors' : 'error'
            console.log(`%c ${errorsFound.length} ${errorWord} found in ${tests.length} tests`, 'background: #f00;')

            console.log(errorsFound)

            console.log('')
            errorsFound.forEach(error => {
                console.log(`%c Test #${error.index} `, 'background:#999; font-weight: bold;color:#fff')
                console.log(error.from)
                console.log(`%c${error.to}`, 'background:#cfc')
                console.log(`%c${error.result}`, 'background:#fcc')
                console.log('')
            })
        } else {
            console.log(`%c No errors found in ${tests.length} tests`, 'background: #0f0')
        }
    }
}
