
function sum (a: number, b: number ) {
    return a +b;
}
describe('blah', () => {
    it('works', () => {
        expect(sum(1, 1)).toEqual(2);
    });
});
