export class ToaFeature {
    static TOFU = new ToaFeature(0, 0)
    static BDADDR = new ToaFeature(0, 1)
    static TDT = new ToaFeature(0, 2)
    static SONG = new ToaFeature(0, 3)
    static PPM = new ToaFeature(0, 4)
    static ADV_INT = new ToaFeature(0, 5)
    static OLD_TKA = new ToaFeature(0, 6)
    static TAC = new ToaFeature(0, 7)
    static TKA = new ToaFeature(1, 1)
    static TDG = new ToaFeature(1, 2)
    static TMD = new ToaFeature(1, 3)
    static TCU = new ToaFeature(1, 4)
    static TIME = new ToaFeature(1, 5)
    static TEST = new ToaFeature(1, 6)
    static TMA = new ToaFeature(1, 7)
    static TFC = new ToaFeature(2, 0)
    static TPFS = new ToaFeature(2, 1)
    static TRM = new ToaFeature(2, 5)
    static TPC = new ToaFeature(2, 6)
    static TPI = new ToaFeature(3, 0)
    static TSD = new ToaFeature(3, 1)
    static TUC = new ToaFeature(3, 2)

    byteLocation: number
    bitLocation: number

    constructor(byteLocation: number, bitLocation: number) {
        this.byteLocation = byteLocation;
        this.bitLocation = bitLocation
    }
}