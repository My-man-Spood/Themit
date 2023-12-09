import { Observable, Subject, filter } from 'rxjs';

export interface Action {
    type: string;
    payload?: any;
}

export class Bus {
    private eventsSubject = new Subject<Action>();
    public eventSubject$ = this.eventsSubject.asObservable();

    constructor() {}

    public on(action): Observable<Action> {
        return this.eventSubject$.pipe(filter((e) => e.type === action));
    }

    public push(type: string, payload?: any): void {
        this.eventsSubject.next({ type, payload });
    }
}
