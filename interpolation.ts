// const regex = /\$\{(("([^"]|\\")*")|[^"'`\{\}]+|\{(\1)*\})*\}/gm;

export function interpolate(template: string, vars: {[key: string]: any}): string {
    const templateLiteralContent = template.replace('\\', '\\\\').replace('`', '\\`');
    const templateLiteral = '`' + templateLiteralContent + '`';
    const args: {name: string, value: any}[] = Object.entries(vars).map(
        ([name, value]) => ({name, value})
    );
    const argumentsDefinition = args.map(arg => arg.name).join(', ');
    const argumentValues = args.map(arg => arg.value);
    const functionDefinition = `(function (${argumentsDefinition}) {
        return ${templateLiteral};
    })`;

    const func = eval(functionDefinition);

    return func(...argumentValues);
}