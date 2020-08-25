import * as ts from 'typescript';

export type Default = boolean | string | undefined | number;

export interface FormProperty {
  title: string;
  type: 'string' | 'boolean';
  default?: boolean | string;
  description?: string;
}

export type FormProperties = {[key: string]: FormProperty};

export interface FormInterface {
  title: string;
  type: 'object';
  properties: FormProperties;
}

export type Form = {[key: string]: FormInterface};

export class Utility {
  static capitalize(str: string) {
    return str.replace(/(?:^|\s|["'([{])+\S/g, match => match.toUpperCase());
  }
  static reSpace(str: string) {
    const regex = /([A-Z])(?=[A-Z][a-z])|([a-z])(?=[A-Z])/g;
    return str.replace(regex, '$& ');
  }
  static fromCamelCaseToSentence(word: string) {
    return Utility.capitalize(Utility.reSpace(word));
  }
}

export class CustomTs {
  static hasJSDocNodes(
    node: ts.Node & {jsDoc?: ts.JSDoc[]}
  ): node is ts.Node & {jsDoc: ts.JSDoc[]} {
    const jsDoc = node.jsDoc;
    return !!jsDoc && jsDoc.length > 0;
  }
  static hasTypeNode(
    node: ts.TypeElement & {type?: ts.TypeNode}
  ): node is ts.TypeElement & {type: ts.TypeNode} {
    const type = node.type;
    return !!type;
  }
}

export class TStoJSONSchema {
  // static fileNodes(file: string, options: ts.CompilerOptions) {
  //   const program = ts.createProgram([file], options);
  //   const source = program.getSourceFile(file);
  //   return source;
  // }
  static inputNodes(input: string, options?: ts.CompilerOptions) {
    const target = options?.target || ts.ScriptTarget.ES5;
    const source = ts.createSourceFile('index.ts', input, target);
    return source;
  }
  static getText(
    node: ts.TypeElement | ts.InterfaceDeclaration
  ): string | undefined {
    const escapedText = node.name;
    if (escapedText && ts.isIdentifier(escapedText)) {
      return escapedText.text;
    }
    return undefined;
  }
  static assertText(node: ts.TypeElement | ts.InterfaceDeclaration): string {
    const escapedText = node.name;
    if (escapedText && ts.isIdentifier(escapedText)) {
      return escapedText.text;
    }
    throw new Error('no title');
  }
  static getType(node: ts.TypeElement) {
    if (CustomTs.hasTypeNode(node)) {
      const kind = node.type.kind;
      if (kind === ts.SyntaxKind.BooleanKeyword) return 'boolean';
      if (kind === ts.SyntaxKind.StringKeyword) return 'string';
      throw new Error(`kind not recognized ${kind}`);
    }
    throw new Error('not TypeNode');
  }
  static getDefault(str: string): Default {
    if (str === '') return undefined;
    if (str === 'undefined') return undefined;
    if (str === 'true') return true;
    if (str === 'false') return false;
    const int = parseInt(str);
    if (!Number.isNaN(int)) return int;
    const isString = str.match(/["|'|`](.+)["|'|`]/);
    if (isString) return isString[1];
    return undefined;
  }
  static getComment(node: ts.TypeElement) {
    let description = '';
    let def: Default = '';
    if (CustomTs.hasJSDocNodes(node)) {
      const docs = node.jsDoc;
      docs.forEach(doc => {
        if (doc.comment) description = doc.comment;
        if (doc.tags) {
          doc.tags.forEach(tag => {
            if (tag.tagName.escapedText === 'default') {
              const pieces = tag.comment?.split(' ') || [];
              if (pieces[0]) {
                def = this.getDefault(pieces[0]);
              }
              if (pieces.length > 1) {
                description = pieces.slice(1, pieces.length).join(' ');
              }
            }
          });
        }
      });
    }
    return {description, def};
  }
  static getProperties(node: ts.InterfaceDeclaration) {
    const members = node.members;
    const properties: FormProperties = {};
    members.forEach(member => {
      const text = this.getText(member);
      if (text) {
        const type = this.getType(member);
        const {def, description} = this.getComment(member);
        properties[text] = {
          title: Utility.fromCamelCaseToSentence(text),
          type,
          ...(def !== '' ? {default: def} : {}),
          ...(description !== '' ? {description} : {}),
        };
      }
    });
    return properties;
  }
  static parseFromSource(source: ts.SourceFile) {
    const results: Form = {};
    ts.forEachChild(source, node => {
      if (ts.isInterfaceDeclaration(node)) {
        const title = this.assertText(node);
        const key = title.toLocaleLowerCase();
        results[key] = {
          title,
          type: 'object',
          properties: this.getProperties(node),
        };
      }
    });
    return results;
  }
  static parse(input: string) {
    const source = TStoJSONSchema.inputNodes(input);
    const properties = TStoJSONSchema.parseFromSource(source);
    return {properties};
  }
}
