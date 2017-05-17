
enum Parameter
{
    immediate = 0,
    register = 1,
    condition = 2,
    offset = 3,
    special = 4
};

class BitRange
{
    field: string;
    start: number;
    bits: number;
    limitlessBits: number;
    constant: number;
    parameter: number;
    
    constructor(field: string, start: number, bits: number, parameter: number = null, constant: number = null, limitlessBits: number = null)
    {
        this.field = field;
        this.start = start;
        this.bits = bits;
        this.parameter = parameter;
        this.constant = constant;
        this.limitlessBits = limitlessBits;
    }
};

class Format
{   
    name: string;
    ranges: BitRange[];
    parameters: string[];
    parameterTypes: Parameter[];
    regex: RegExp;
    disassembly: string;

    rData1Arg: number;
    rData2Arg: number;

    disassemble(mnemonic: string, args: number[], abiNames: string[]): string
    {
        var output = this.disassembly;
        output = output.replace("@mnem", mnemonic);
        for (var i = 0; i < this.parameters.length; i++)
        {
            if ((args[i] == null) || (output.search("@arg") === -1))
            {
                console.log("Disassembler note: Argument mismatch.");
                break;
            }
            output = output.replace("@arg", (this.parameterTypes[i] === Parameter.register)? abiNames[args[i]] : args[i].toString());            
        }
        return output;
    }

    parameterBitRangeIndex(parameter: string): number
    {
        for (var i = 0; i < this.ranges.length; i++)
        {
            if (this.ranges[i].field === parameter)
            {
                return i;
            }
            var limits = /([A-za-z]+)\s*\[\s*(\d+)\s*:\s*(\d+)\s*\]/.exec(this.ranges[i].field);
            if (limits !== null)
            {
                if (limits[1] === parameter)
                {
                    return i;
                }
            }
        }
        return null;
    }

    fieldParameterIndex(range: string): number
    {
        for (var i = 0; i < this.parameters.length; i++)
        {
            if (this.parameters[i] == range)
            {
                return i;
            }
        }
        return null;
    }

    processSpecialParameter: (address: number, text: string, bits: number, labels: string[], addresses: number[]) => ({errorMessage: string, value: number});
    decodeSpecialParameter: (value: number, address: number) => number;

    constructor
    (
        name: string,
        ranges: BitRange[],
        parameters: string[],
        parameterTypes: Parameter[],
        regex: RegExp,
        disassembly: string,
        rData1Arg: number = 1,
        rData2Arg: number = 2,
        processSpecialParameter: (address: number, text: string, bits: number, labels: string[], addresses: number[]) => ({errorMessage: string, value: number}) = null,
        decodeSpecialParameter: (value: number, address: number) => number = null
    )
    {
        this.name = name;
        this.parameters = parameters;
        this.ranges = ranges;
        this.parameterTypes = parameterTypes;
        this.regex = regex;
        this.disassembly = disassembly;
        this.processSpecialParameter = processSpecialParameter;
        this.decodeSpecialParameter = decodeSpecialParameter;
        this.rData1Arg = rData1Arg;
        this.rData2Arg = rData2Arg
    }        
};

class Instruction
{
    mnemonic: string;
    format: Format;
    constants: string[];
    constValues: number[];
    available: boolean;
    signed: boolean;

    executor: (core: MIPSCore) => number;
    memory: (core: MIPSCore) => number;
    writeBack: (core: MIPSCore) => number;

    private pad(str: string, length: number): string
    {
        var padded = str;
        for (var i = 0; i < length - str.length; i++)
        {
            padded = "0" + padded;
        }
        return padded;
    }

    mask(): string
    {
        var str = "";
        for (var i = 0; i < this.format.ranges.length; i++)
        {
            let index = this.constants.indexOf(this.format.ranges[i].field);
            if (index !== -1)
            {
                str += this.pad(this.constValues[index].toString(2), this.format.ranges[i].bits);
            }
            else if (this.format.ranges[i].constant != null)
            {
                str += this.pad(this.format.ranges[i].constant.toString(2), this.format.ranges[i].bits);
            }
            else
            {
                for (var j = 0; j < this.format.ranges[i].bits; j++)
                {
                    str += "X";
                }
            }
        }

        return str;
    };

    match(machineCode: number): boolean
    {
        var machineCodeMutable = machineCode >>> 0;
        let maskBits = this.mask().split("");
        for (var i = 31; i >= 0; i--)
        {
            if (maskBits[i] === "X")
            {
                machineCodeMutable = machineCodeMutable >>> 1;
                continue;
            }
            if (parseInt(maskBits[i]) !== (machineCodeMutable & 1))
            {
                return false;
            }
            machineCodeMutable = machineCodeMutable >>> 1;
        }
        //console.log("Match Log: Matched 0b" + (machineCode >>> 0).toString(2) + " with " + this.mnemonic + ".");
        return true;
    }

    template(): number
    {
        return parseInt(this.mask().split("X").join("0"), 2);
    };


    constructor(mnemonic: string, format: Format, constants: string[], constValues: number[], executor: (core: MIPSCore) => number, memory: (core: MIPSCore) => number, wb: (core: MIPSCore) => number, signed: boolean = true, available: boolean = true)
    {
        this.mnemonic = mnemonic;
        this.format = format;
        this.constants = constants;
        this.constValues = constValues;
        this.available = available;
        this.signed = signed;
        this.executor = executor;
        this.writeBack = wb;
        this.memory = memory;        
    }
};

class InstructionSet
{
    name: string;
    formats: Format[];   
    instructions: Instruction[];
    dataDirectives: string[];
    dataDirectiveSizes: number[];            

    //Return Mnemonic Index (True)
    private mnemonicSearch(mnemonic: string): number
    {
        for (var i = 0; i < this.instructions.length; i++)
        {
            if (this.instructions[i].mnemonic == mnemonic)
            {
                return i;
            }
        }
        return -1;
    } //Worst case = instructions.length

    //Validates Parameter, returns value in binary
    processParameter: (address: number, text: string, type: Parameter, bits: number, labels: string[], addresses: number[]) => ({errorMessage: string, value: number});

    //Number of bits.
    bits: number;

    //Closures to assemble a file
    tokenize: (file: string) => ({errorMessage: string, labels: string[], addresses: number[], lines: string[], pc: number[]});
    assemble: (nester: number, address: number, lines: string[], labels: string[], addresses: number[]) => ({errorMessage: string, machineCode: number[], size: number});

    //Register abiNames
    abiNames: string[];
    
    /*
        InstructionSet initializer
    */
    constructor(
        name: string,
        bits: number,
        formats: Format[],
        instructions: Instruction[],
        dataDirectives: string[],
        dataDirectiveSizes: number[],
        abiNames: string[],
        process: (address: number, text: string, type: Parameter, bits: number, labels: string[], addresses: number[]) => ({errorMessage: string, value: number}),
        tokenize: (file: string) => ({errorMessage: string, labels: string[], addresses: number[], lines: string[], pc: number[]}),
        assemble: (nester: number, address: number, lines: string[], labels: string[], addresses: number[]) => ({errorMessage: string, machineCode: number[], size: number})
    )
    {
        this.name = name;
        this.bits = bits;
        this.formats = formats;
        this.instructions = instructions;
        this.dataDirectives = dataDirectives;
        this.dataDirectiveSizes = dataDirectiveSizes;
        this.abiNames = abiNames;

        this.processParameter = process;  
        this.tokenize = tokenize;
        this.assemble = assemble;
    }
};