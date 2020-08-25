import {TStoJSONSchema} from './mod';
import * as fs from 'fs';
import * as path from 'path';
import {expect} from 'chai';
import * as ts from 'typescript';

type RawSpec = {[name: string]: {code: string[]; result: {}}};
type SpecTest = {name: string; code: string; result: {}};
function loadSpec(): SpecTest[] {
  const spec = fs.readFileSync(path.join(__dirname, './spec.json'), 'utf8');
  const data = JSON.parse(spec) as RawSpec;
  return Object.keys(data).map((name: string) => {
    const item = data[name];
    // if (!item.code) throw new Error(`spec ${name} invalid, missing code`);
    // if (!item.result) throw new Error(`spec ${name} invalid, missing result`);
    return {...item, code: item.code.join('\n'), name};
  });
}

describe('TStoJSONSchema', () => {
  context('spec', () => {
    loadSpec().forEach(item => {
      it(`testing spec ${item.name}`, () => {
        const result = TStoJSONSchema.parse(item.code);
        expect(result).to.deep.equal(item.result);
      });
    });
  });
  context('.getDefault()', () => {
    it('should cover all cases', () => {
      expect(TStoJSONSchema.getDefault('true')).to.equal(true);
      expect(TStoJSONSchema.getDefault('false')).to.equal(false);
      expect(TStoJSONSchema.getDefault('333')).to.equal(333);
      expect(TStoJSONSchema.getDefault('"hello"')).to.equal('hello');
      expect(TStoJSONSchema.getDefault("'hello'")).to.equal('hello');
      expect(TStoJSONSchema.getDefault('`hello`')).to.equal('hello');
      expect(TStoJSONSchema.getDefault('undefined')).to.equal(undefined);
      expect(TStoJSONSchema.getDefault('')).to.equal(undefined);
      expect(TStoJSONSchema.getDefault('"')).to.equal(undefined);
    });
  });
  context('.inputNodes()', () => {
    it('should cover option case', () => {
      TStoJSONSchema.inputNodes('', {target: ts.ScriptTarget.ES5});
    });
  });
  context('.getText()', () => {
    it('should cover else cases', () => {
      expect(TStoJSONSchema.getText({} as ts.TypeElement)).to.equal(undefined);
    });
  });
  context('.assertText()', () => {
    it('should cover else cases', () => {
      expect(() => {
        TStoJSONSchema.assertText({} as ts.TypeElement);
      }).to.throw();
    });
  });
  context('.getType()', () => {
    it('should cover else cases', () => {
      expect(() => {
        TStoJSONSchema.getType({} as ts.TypeElement);
      }).to.throw();
      expect(() => {
        TStoJSONSchema.getType({type: {}} as ts.TypeElement & {type?: {}});
      }).to.throw();
    });
  });
  context('.getComment()', () => {
    it('should cover else cases', () => {
      const dummy = {description: '', def: ''};
      expect(TStoJSONSchema.getComment({} as ts.TypeElement)).to.deep.equal(
        dummy
      );
      expect(
        TStoJSONSchema.getComment({jsDoc: {}} as ts.TypeElement & {jsDoc?: {}})
      ).to.deep.equal(dummy);
      expect(
        TStoJSONSchema.getComment(({
          jsDoc: [
            {
              tags: [
                {
                  tagName: {
                    escapedText: 'notDefault',
                  },
                },
              ],
            },
          ],
        } as unknown) as ts.TypeElement & {jsDoc?: {}})
      ).to.deep.equal(dummy);
      expect(
        TStoJSONSchema.getComment(({
          jsDoc: [
            {
              tags: [
                {
                  tagName: {
                    escapedText: 'default',
                  },
                },
              ],
            },
          ],
        } as unknown) as ts.TypeElement & {jsDoc?: {}})
      ).to.deep.equal(dummy);
    });
  });
  context('.getProperties()', () => {
    it('should cover else cases', () => {
      expect(
        TStoJSONSchema.getProperties(({
          members: [{}],
        } as unknown) as ts.InterfaceDeclaration)
      ).to.deep.equal({});
    });
  });
  context('.parse()', () => {
    it('should cover nameless interface', () => {
      TStoJSONSchema.parse(`
      interface {
        key: string
      }
      `);
    });
  });
});
