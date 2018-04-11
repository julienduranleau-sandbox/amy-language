class AmyTranspiler {

    static transpile(file) {
        return new Promise((resolve, reject) => {
            let transpiler = new AmyTranspiler()

            fetch(file).then(f=>f.text()).then(sourceText => {
                let js = transpiler.parse(sourceText)
                resolve(js)
            })
        })
    }

    constructor() {
        this.indentSize = 4
        this.simpleRules = [
            {
                name: 'any "=" to "=="',
                from: /=/,
                to: '==='
            },
            {
                name: 'comments',
                from: /^;/,
                to: '//'
            },
            {
                name: 'set variableName',
                from: /set ([A-Za-z0-9_]+):/,
                to: 'let $1 ='
            },
            {
                name: 'define aFunction(with, parameters)',
                from: /define ([A-Za-z0-9_]+)(\([A-Za-z0-9,]\))/,
                to: 'function $1$2 {'
            },

        ]
    }

    parse(rawSrc) {
        this.showAmySource(rawSrc)

        let lines = rawSrc.split('\n')

        let previousIndentLevel = 0
        let indentLevel = 0

        lines = lines.map(line => {
            previousIndentLevel = indentLevel
            indentLevel = this.getIndentLevelForLine(line)

            this.simpleRules.forEach(rule => {
                line = line.replace(rule.from, rule.to)
            })

            // when going down indent level(s), add closing bracket(s)
            if (indentLevel < previousIndentLevel) {
                let nBracketsToAdd = (previousIndentLevel - indentLevel) / this.indentSize
                for (let i = 0; i < nBracketsToAdd; i++) {
                    line = '}\n'+line
                }
            }

            if (line.indexOf('?') > -1) {
                line = this.getConditionForLine(line)
            }

            return line
        })

        this.showJsSource(lines.join('\n'))
    }

    getConditionForLine(line) {
        let lineWithoutNewline = line.replace(/\r?\n|\r/, '')
        let newLine = null
        let [left, right] = lineWithoutNewline.split(/is|are/)

        // x is even?
        if (left && right) {
            let params = left.trim().split(' and ')
            right = right.replace(' not ', '!')
            newLine = right.trim().replace('?', '(' + params.join(',') + ')')
        } else {
            newLine = lineWithoutNewline.replace('?', '')
        }
        newLine = 'if (' + newLine + ') {'
        return newLine
    }

    getIndentLevelForLine(line) {
        let spaces = line.match(/^ +/g)

        if (spaces) {
            return spaces[0].length / this.indentSize
        } else {
            return 0
        }
    }

    showAmySource(sourceText) {
        document.getElementById('amy').innerText = sourceText
    }

    showJsSource(sourceText) {
        document.getElementById('js').innerText = sourceText
    }
}
