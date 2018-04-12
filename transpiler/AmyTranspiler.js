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
        this.structureFindAndReplaceRules = [

        ]
        this.findAndReplaceRules = [
            {
                name: 'any "=" to "==="',
                example: '1 = 2',
                from: /=/,
                to: '==='
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
                from: /(\(.*\)|[A-Za-z0-9_]+) ?-\(([\+-][A-Za-z0-9_]+)\)-> ?(\(.+\)|[A-Za-z0-9_]+)/,
                to: '[...range($1, $3, $2)]'
            },
            {
                name: 'simple arrow range',
                example: '1->10',
                from: /(\(.*\)|[A-Za-z0-9_]+) ?-> ?(\(.*\)|[A-Za-z0-9_]+)/,
                to: '[...range($1, $2)]'
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
                to: 'class'
            },
        ]
    }

    parse(rawSrc) {
        let lines = rawSrc.split('\n')

        lines = lines.map((line, index) => {
            if (index === lines.length - 1) {
                return line
            } else {
                return line + '\n'
            }
        })

        let previousIndentLevel = 0
        let indentLevel = 0
        let context = []

        for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
            let amyLine = lines[lineNumber]
            let line = amyLine

            previousIndentLevel = indentLevel
            indentLevel = this.getIndentLevelForLine(line)

            if (line.search(/\([A-Za-z_\.]/) > -1) {
                line = this.transformFunctionCalls(line)
            }

            for (let rule of this.structureFindAndReplaceRules) {
                if (line.search(rule.from) > -1) {
                    line = line.replace(rule.from, rule.to)
                    break
                }
            }

            for (let rule of this.findAndReplaceRules) {
                line = line.replace(rule.from, rule.to)
            }

            // when going down indent level(s), add closing bracket(s)
            if (indentLevel < previousIndentLevel) {
                let nContextToEnd = (previousIndentLevel - indentLevel) / this.indentSize
                for (let i = 0; i < nContextToEnd; i++) {
                    let endingContext = context.pop()

                    if (endingContext === 'function') {
                        lines[lineNumber - 1] = lines[lineNumber - 1].replace(/^(\s+)/, '$1return ')
                    }

                    line = '}\n' + line
                }
            }

            if (amyLine.indexOf('?') > -1) {
                line = this.getConditionForLine(line)
                context.push('condition')
            }

            if (amyLine.indexOf('define') > -1) {
                context.push('function')
            }

            if (amyLine.indexOf('loop') > -1) {
                context.push('loop')
            }

            lines[lineNumber] = line
        }

        let result = lines.join('')

        return result
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
        let newLine = null
        let [left, right] = lineWithoutNewline.split(/is|are/)

        if (left && right) {
            let params = left.trim().split(' and ')
            right = right.replace(' not ', '!')
            params = params.map(param => {
                return right.trim().replace('?', '(' + param + ')')
            })
            newLine = params.join(' && ')
        } else {
            newLine = lineWithoutNewline.replace('?', '')
            newLine = newLine.replace(' and ', ' && ')
        }
        newLine = 'if (' + newLine + ') {\n'
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
}
