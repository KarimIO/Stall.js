/// <reference path="InstructionSet.ts"/>
/// <reference path="MIPS.ts"/>
// The Zero Interface
// Should be mostly pure Javascript, as it is indeed an interface for Javascript.
// INTERFACE GUIDE: If null, then it looks like it was successful. Else, it is unsuccessful.
var debug = false;
var consoleTests = false;

function h2b(hex) {
	var hexArr = hex.split(' '); // Remove spaces, then seperate characters
	var byteArr = [];
	for (var i=0; i < hexArr.length; i++) {
		let value = parseInt(hexArr[i], 16);
		if (!isNaN(value))
		{
			byteArr.push(value);
		}
	}

	return byteArr;
}

function assemble(core: MIPSCore, data: string): ({errorMessage: string, machineCode: number[], size: number})
{
    var token = core.instructionSet.tokenize(data);
    if (debug)
    {
        console.log(token.labels);
        console.log(token.addresses);
    }
    if (token.errorMessage === null)
    {
        return core.instructionSet.assemble(null, 0, token.lines, token.labels, token.addresses);
    }
    else
    {
        return {errorMessage: token.errorMessage, machineCode: null, size: 0};
    }
}

function loadIntoMemory(core: MIPSCore, data: number[]): string
{
    if (core.memset(0, data) === null)
        return "Program is too large.";

    return null;
}

function loadMemStep(core: MIPSCore, data: number[]): string
{
    var load = loadIntoMemory(core, data);
    if (load !== null)
    {
        return load;
    }

    simulateStep(core);
}

function passPipeline(core: MIPSCore): void {
    var cycleParts:string[] = [];
    var instName = "";
    
    if (core.ifBubble.instruction) {
        if (core.ifBubble.valid) {
            instName = core.ifBubble.instruction.mnemonic;
            cycleParts.push("IF");
        }
    }
    if (core.isBubble.instruction)
    {
        if (core.isBubble.instruction.valid)
        {
            cycleParts.push("IS");
        }
        else
        {
            cycleParts.push("S");
        }
    }
    if (core.rfBubble.instruction)
    {
        if (core.rfBubble.instruction.valid)
        {
            cycleParts.push("RF");
        }
        else
        {
            cycleParts.push("S");
        }
    }
    if (core.eBubble.instruction)
    {
        if (core.eBubble.instruction.valid)
        {
            cycleParts.push("EX");
        }
        else
        {
            cycleParts.push("S");
        }
    }
    if (core.df1Bubble.instruction)
    {
        if (core.df1Bubble.instruction.valid)
        {
            cycleParts.push("DF");
        }
        else
        {
            cycleParts.push("S");
        }
    }
    if (core.df2Bubble.instruction)
    {
        if (core.df2Bubble.instruction.valid)
        {
            cycleParts.push("DS");
        }
        else
        {
            cycleParts.push("S");
        }
    }
    if (core.tcBubble.instruction)
    {
        if (core.tcBubble.instruction.valid)
        {
            cycleParts.push("TC");
        }
        else
        {
            cycleParts.push("S");
        }
    }
    if (!core.writeBackNull)
    {
        if (core.writeBackValid)
        {
            cycleParts.push("WB");
        }
        else
        {
            cycleParts.push("S");
        }
    }
        
    core.addCycle(instName, cycleParts);
}

function simulateStep(core: MIPSCore): string
{
    var cycle = core.cycle()
    
    if (cycle == "SYSCALL")
    {
        return "@Oak_Ecall";
    }

    if (cycle != null)
    {
        return cycle;
    }

    core.instructionCallback("End of Cycle " + core.cycleCounter);

    passPipeline(core);

    return null;
}

//It is recommended to simulateStep
function simulate(core: MIPSCore, data: number[]): string
{
    var load = loadIntoMemory(core, data);
    if (load !== null)
    {
        return load;
    }

    return continueSim(core);
}

function continueSim(core: MIPSCore): string
{
    var step = simulateStep(core);
    var i=0;
    for(var i=0; i < 16384 && step === null; i++)
    {
        step = simulateStep(core);
    }
    if (i == 16384) {
        return "ERROR: Possible Infinite Loop";
    }

    if (step !== null)
    {
        return step;
    }
    return null;
}

function registerRead(core: MIPSCore, index: number): number
{
    return core.registerFile.read(index);
}

function registerWrite(core: MIPSCore, index: number, value: number)
{
    core.registerFile.write(index, value);
}

function getMemory(core: MIPSCore)
{
    return core.memory;
}

function getRegisterABINames(core: MIPSCore): string[]
{
    return core.registerFile.abiNames;
}

function resetCore(core: MIPSCore)
{
    core.clearPipeline();
    core.reset();
}

interface Array<T> {
Oak_hex(): string;
}

Array.prototype.Oak_hex = function () {
    var hexadecimal = "";
    for (var i = 0; i < this.length; i++)
    {
        var hexRepresentation = this[i].toString(16).toUpperCase();
        if (hexRepresentation.length === 1)
        {
            hexRepresentation = "0" + hexRepresentation;
        }
        hexadecimal += hexRepresentation + " ";
    }
    return hexadecimal;
};

// //Terminal Test
// var program = 
// `
// addi $s0, $zero, 13
// addi $s1, $zero, 1
// addi $s2, $zero, 2
// addi $s3, $zero, 0
// loop: beq $s1, $s0, exit
// add $s3, $s3, $s2
// j loop
// exit: syscall
// `;

// var done = false;

// var core = new MIPSCore(2048, function() { console.log("RECIEVED KILL COMMAND"); process.exit(0); }, function(data) { console.log(data); }, function(){}, function(){});

// var op = assemble(core, program);

// core.memset(0, op.machineCode);

// while (!done)
// {
//     simulateStep(core);
// }