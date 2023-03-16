import { Shorten } from "../src/lib/common/utils/shorten";

describe("Utils Tests", () => {

    it("Shorten", () => {
        expect(Shorten.shorten("1234567890", 6)).toBe("1234567890");
        expect(Shorten.shorten("1234567890", 5)).toBe("1234567890");
        expect(Shorten.shorten("1234567890", 4)).toBe("1234..7890");
        expect(Shorten.shorten("1234567890", 3)).toBe("123..890");
        expect(Shorten.shorten("1234567890", 2)).toBe("12..90");
        expect(Shorten.shorten("1234567890", 1)).toBe("1..0");
      
    });
  

});