class AmyTranspiler {

    static transpile(file) {
        return new Promise((resolve, reject) => {
            let transpiler = new AmyTranspiler()

            fetch(file).then(f=>f.text()).then(amySource => {
                amySource = amySource.replace(/\r\n/gm, '\n')
                let jsSource = transpiler.parse(amySource)

                resolve({
                    jsSource,
                    amySource
                })
            })
        })
    }

    constructor() {
        this.indentSize = 4
        this.finalTranspiledSource = null
        this.lines = null
        this.outputLines = null
        this.indentLevel = null
        this.previousIndentLevel = null
        this.contextStack = null

        this.findAndReplaceRules = [
            {
                name: 'any "=" to "==="',
                example: '1 = 2',
                from: /=/g,
                to: '==='
            },
            {
                name: 'this.',
                example: '.x',
                from: /([^.a-zA-Z0-9_])\.([A-Za-z_][A-Za-z0-9_]*)/g,
                to: '$1this.$2'
            },
            {
                name: 'this. on first line (edge case)',
                example: '.x',
                from: /^\.([A-Za-z_][A-Za-z0-9_]*)/g,
                to: 'this.$1'
            },
            {
                name: 'comments',
                example: '   ; this is a comment after some whitespace',
                from: /^\s*;.*\n/g,
                to: ''
            },
            {
                name: 'set variable',
                example: 'set a: 10',
                from: /set ([A-Za-z0-9_]+) ?:/,
                to: 'let $1 ='
            },
            {
                name: 'assign variable',
                example: 'a: 10',
                from: /([A-Za-z0-9_]+) ?:/g,
                to: '$1 ='
            },
            {
                name: 'stop',
                example: 'stop',
                from: /stop\n$/,
                to: 'break;\n'
            },
            {
                name: 'complex arrow range with complex from/to',
                example: 'a -(+2)-> b',
                from: /(\(.*\)|[A-Za-z0-9_]+) ?-\(([\+-][A-Za-z0-9_]+)\)-> ?(\(.+\)|[A-Za-z0-9_]+)/g,
                to: '[...range($1, $3, $2)]'
            },
            {
                name: 'simple arrow range',
                example: '1->10',
                from: /(\(.*\)|[A-Za-z0-9_]+) ?-> ?(\(.*\)|[A-Za-z0-9_]+)/g,
                to: '[...range($1, $2)]'
            },
            {
                name: 'define a function without parameters',
                example: 'define sayHello()',
                from: /define ([A-Za-z0-9_]+)\(\)/,
                to: 'function $1() {'
            },
            {
                name: 'define a function with parameters',
                example: 'define areTheSame(a,b,c)',
                from: /define ([A-Za-z0-9_]+)(\([A-Za-z0-9](, ?[A-Za-z0-9])*\))/,
                to: 'function $1$2 {'
            },
            {
                name: 'loop forever',
                example: 'loop forever',
                from: /loop forever/,
                to: 'while (1) {'
            },
            {
                name: 'loops',
                example: 'loop 1 -> 10 as i',
                from: /loop (.+) as (.+)/,
                to: 'for (let $2 of $1) {'
            },
            {
                name: 'class definition with extends',
                example: 'class Dog from Animal',
                from: /define ([A-Za-z0-9_]+) from ([A-Za-z0-9_]+)/,
                to: 'class $1 extends $2 {'
            },
            {
                name: 'class definition',
                example: 'class Dog from Animal',
                from: /define ([A-Za-z0-9_]+)?/,
                to: 'class $1 {'
            },
        ]
    }

    parse(rawSrc) {
        this.lines = rawSrc.split('\n')
        this.outputLines = []
        this.previousIndentLevel = 0
        this.indentLevel = 0
        this.contextStack = []
        this.finalTranspiledSource = null

        this.lines = this.lines.map((line, i) => {
            return (i === this.lines.length - 1) ? line : line + '\n'
        })

        for (let i = 0, nLines = this.lines.length; i < nLines; i++) {
            this.parseLine(i)
        }

        // end of file, close remaining open contexts
        this.indentLevel = 0
        this.closeIndentLevels()

        this.finalTranspiledSource = this.outputLines.join('')

        return this.finalTranspiledSource
    }

    parseLine(lineNumber) {
        let amyLine = this.lines[lineNumber]
        let line = amyLine

        this.previousIndentLevel = this.indentLevel
        this.indentLevel = this.getIndentLevelForLine(line)
        this.indentLevel = (this.indentLevel === null)
            ? this.previousIndentLevel
            : this.indentLevel

        let currentContextIndex = this.getCurrentContextIndex()

        if (this.contextStack[currentContextIndex] === 'class') {
            // try to find a method declaration
            if (line.search(/[A-Za-z0-9_]+\(.*\)/) > -1) {
                line = line.replace(/([A-Za-z0-9_]+\(.*\))/, '$1 {')
                this.contextStack.push('method')
            }
        }

        // format function calls ex: (print 'test')
        if (line.search(/\([A-Za-z_\.]/) > -1) {
            line = this.transformFunctionCalls(line)
        }

        for (let rule of this.findAndReplaceRules) {
            line = line.replace(rule.from, rule.to)
        }

        this.closeIndentLevels()

        // format conditions ex: x is even?
        if (amyLine.indexOf('?') > -1) {
            line = this.getConditionForLine(line)
        }

        let newContext = this.getNewContextFromLine(amyLine, line)
        if (newContext) {
            this.contextStack.push(newContext)
        }

        this.outputLines.push(line)
    }

    getContextToEndCount() {
        return Math.max(0, this.previousIndentLevel - this.indentLevel)
    }

    getCurrentContextIndex() {
        return this.contextStack.length - 1 - this.getContextToEndCount()
    }

    // when going down indent level(s), add closing bracket(s) and return
    closeIndentLevels() {
        let nContextToEnd = this.getContextToEndCount()
        let currentContextIndex = this.getCurrentContextIndex()
        let addBlankLineBackAfterBrackets = false

        let requireNewLine = false

        for (let contextIndex = 0; contextIndex < nContextToEnd; contextIndex++) {
            let endingContext = this.contextStack.pop()

            if (endingContext === 'function' || endingContext === 'method') {
                this.addFunctionReturns()
            }

            // apply closing brackets
            requireNewLine = this.addClosingBrackets() || requireNewLine
        }

        if (requireNewLine) {

        }

        if (addBlankLineBackAfterBrackets) {
            outputLines.push('\n')
        }
    }

    addClosingBrackets() {
        let nContextToEnd = this.getContextToEndCount()
        let contextIndex = this.getCurrentContextIndex()
        let addBlankLineBackAfterBrackets = false

        if (this.outputLines[this.outputLines.length - 1].trim().length === 0) {
            this.outputLines.pop()
            addBlankLineBackAfterBrackets = true
        }
        let remainingIndent = ' '.repeat(this.indentSize).repeat(this.indentLevel + nContextToEnd - contextIndex - 1)
        this.outputLines.push(`${remainingIndent}}\n`)

        return addBlankLineBackAfterBrackets
    }

    addFunctionReturns() {
        let i = 0

        while(1) {
            let prevLineIndex = this.outputLines.length - 1 - i
            let prevLine = this.outputLines[prevLineIndex]

            if (prevLine.trim().length !== 0) {
                this.outputLines[prevLineIndex] = prevLine.replace(/^(\s+)/, '$1return ')
                break
            }

            if (i++ === 1000) {
                throw new Error('Impossible to find a line to apply return to')
            }
        }
    }

    getNewContextFromLine(amyLine, line) {
        if (amyLine.indexOf('?') > -1) {
            return 'condition'
        } else if (line.indexOf('function ') > -1) {
            return 'function'
        } else if (line.indexOf('class ') > -1) {
            return 'class'
        } else if (amyLine.indexOf('loop') > -1) {
            return 'loop'
        } else {
            return null
        }
    }

    transformFunctionCalls(line) {
        if (line.indexOf('define ') > -1) {
            return line
        }

        let selfCallFunctionFrom = /\(([A-Za-z_][A-Za-z0-9_\.]*)\)/
        line = line.replace(selfCallFunctionFrom, '$1()')

        let fnWithArgs = /\(([a-zA-Z0-9_\.]+) ([\['(A-Za-z0-9_])/
        for (let i = 0; i < 1000; i++) {
            if (line.search(fnWithArgs) === -1) {
                break
            }

            line = line.replace(fnWithArgs, '$1($2')
        }

        return line
    }

    getConditionForLine(line) {
        let lineWithoutNewline = line.replace(/\n/, '')
        let condition = null
        let [left, right] = lineWithoutNewline.split(/is|are/)

        if (left && right) {
            let params = left.trim().split(' and ')
            right = right.replace(' not ', '!')
            params = params.map(param => {
                return right.trim().replace('?', '(' + param + ')')
            })
            condition = params.join(' && ')
        } else {
            condition = lineWithoutNewline.replace('?', '')
            condition = condition.replace(' and ', ' && ')
        }

        condition = 'if (' + condition + ') {\n'

        let whitespace = line.match(/^\s*/g)[0]

        return whitespace + condition
    }

    getIndentLevelForLine(line) {
        let spaces = line.match(/^ +/g)

        if (spaces) {
            return spaces[0].length / this.indentSize
        } else {
            if (line.trim().length === 0) {
                return null
            } else {
                return 0
            }
        }
    }
}
