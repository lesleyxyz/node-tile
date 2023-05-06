export class RingingStateType {
    static RESET = new RingingStateType(0)
    static READY = new RingingStateType(1)
    static PLAY_ISSUED = new RingingStateType(2)
    static AWAIT_PLAY_RESPONSE = new RingingStateType(3)
    static RESPONSE_RECEIVED = new RingingStateType(4)
    static PENDING_PLAY = new RingingStateType(5)
    static PENDING_DONE = new RingingStateType(6)

    i: number
    constructor(i){
        this.i = i
    }
}

export class RingingStateMachine {
    ringingState: RingingStateType

    constructor(){
        this.ringingState = RingingStateType.RESET
    }
}