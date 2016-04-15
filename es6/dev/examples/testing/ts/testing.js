import { describe, fdescribe, xdescribe, it, fit, xit, beforeEach, afterEach, beforeEachProviders, inject } from 'angular2/testing';
import { provide } from 'angular2/core';
var db;
class MyService {
}
class MyMockService {
}
// #docregion describeIt
describe('some component', () => {
    it('does something', () => {
        // This is a test.
    });
});
// #enddocregion
// #docregion fdescribe
fdescribe('some component', () => {
    it('has a test', () => {
        // This test will run.
    });
});
describe('another component', () => { it('also has a test', () => { throw 'This test will not run.'; }); });
// #enddocregion
// #docregion xdescribe
xdescribe('some component', () => { it('has a test', () => { throw 'This test will not run.'; }); });
describe('another component', () => {
    it('also has a test', () => {
        // This test will run.
    });
});
// #enddocregion
// #docregion fit
describe('some component', () => {
    fit('has a test', () => {
        // This test will run.
    });
    it('has another test', () => { throw 'This test will not run.'; });
});
// #enddocregion
// #docregion xit
describe('some component', () => {
    xit('has a test', () => { throw 'This test will not run.'; });
    it('has another test', () => {
        // This test will run.
    });
});
// #enddocregion
// #docregion beforeEach
describe('some component', () => {
    beforeEach(() => { db.connect(); });
    it('uses the db', () => {
        // Database is connected.
    });
});
// #enddocregion
// #docregion beforeEachProviders
describe('some component', () => {
    beforeEachProviders(() => [provide(MyService, { useClass: MyMockService })]);
    it('uses MyService', inject([MyService], (service) => {
        // service is an instance of MyMockService.
    }));
});
// #enddocregion
// #docregion afterEach
describe('some component', () => {
    afterEach((done) => { db.reset().then((_) => done()); });
    it('uses the db', () => {
        // This test can leave the database in a dirty state.
        // The afterEach will ensure it gets reset.
    });
});
// #enddocregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRpZmZpbmdfcGx1Z2luX3dyYXBwZXItb3V0cHV0X3BhdGgtV0R6dWpMOGQudG1wL2FuZ3VsYXIyL2V4YW1wbGVzL3Rlc3RpbmcvdHMvdGVzdGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiT0FBTyxFQUNMLFFBQVEsRUFDUixTQUFTLEVBQ1QsU0FBUyxFQUNULEVBQUUsRUFDRixHQUFHLEVBQ0gsR0FBRyxFQUNILFVBQVUsRUFDVixTQUFTLEVBQ1QsbUJBQW1CLEVBQ25CLE1BQU0sRUFDUCxNQUFNLGtCQUFrQjtPQUNsQixFQUFDLE9BQU8sRUFBQyxNQUFNLGVBQWU7QUFFckMsSUFBSSxFQUFPLENBQUM7QUFDWjtBQUFpQixDQUFDO0FBQ2xCO0FBQTBDLENBQUM7QUFFM0Msd0JBQXdCO0FBQ3hCLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRTtJQUN6QixFQUFFLENBQUMsZ0JBQWdCLEVBQUU7UUFDSSxrQkFBa0I7SUFDdEIsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUM7QUFDSCxnQkFBZ0I7QUFFaEIsdUJBQXVCO0FBQ3ZCLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRTtJQUMxQixFQUFFLENBQUMsWUFBWSxFQUFFO1FBQ0ksc0JBQXNCO0lBQzFCLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsUUFBUSxDQUFDLG1CQUFtQixFQUNuQixRQUFRLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxRQUFRLE1BQU0seUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZGLGdCQUFnQjtBQUVoQix1QkFBdUI7QUFDdkIsU0FBUyxDQUFDLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxDQUFDLFlBQVksRUFBRSxRQUFPLE1BQU0seUJBQXlCLENBQUEsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xHLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRTtJQUM1QixFQUFFLENBQUMsaUJBQWlCLEVBQUU7UUFDSSxzQkFBc0I7SUFDMUIsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUM7QUFDSCxnQkFBZ0I7QUFFaEIsaUJBQWlCO0FBQ2pCLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRTtJQUN6QixHQUFHLENBQUMsWUFBWSxFQUFFO1FBQ0ksc0JBQXNCO0lBQzFCLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxRQUFRLE1BQU0seUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUMsQ0FBQztBQUNILGdCQUFnQjtBQUVoQixpQkFBaUI7QUFDakIsUUFBUSxDQUFDLGdCQUFnQixFQUFFO0lBQ3pCLEdBQUcsQ0FBQyxZQUFZLEVBQUUsUUFBUSxNQUFNLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDOUQsRUFBRSxDQUFDLGtCQUFrQixFQUFFO1FBQ0ksc0JBQXNCO0lBQzFCLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsZ0JBQWdCO0FBRWhCLHdCQUF3QjtBQUN4QixRQUFRLENBQUMsZ0JBQWdCLEVBQUU7SUFDekIsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEMsRUFBRSxDQUFDLGFBQWEsRUFBRTtRQUNJLHlCQUF5QjtJQUM3QixDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQztBQUNILGdCQUFnQjtBQUVoQixpQ0FBaUM7QUFDakMsUUFBUSxDQUFDLGdCQUFnQixFQUFFO0lBQ3pCLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUMsUUFBUSxFQUFFLGFBQWEsRUFBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzNFLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLE9BQXNCO1FBQ25CLDJDQUEyQztJQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDO0FBQ0gsZ0JBQWdCO0FBRWhCLHVCQUF1QjtBQUN2QixRQUFRLENBQUMsZ0JBQWdCLEVBQUU7SUFDekIsU0FBUyxDQUFDLENBQUMsSUFBYyxPQUFPLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLEVBQUUsQ0FBQyxhQUFhLEVBQUU7UUFDSSxxREFBcUQ7UUFDckQsMkNBQTJDO0lBQy9DLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsZ0JBQWdCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgZGVzY3JpYmUsXG4gIGZkZXNjcmliZSxcbiAgeGRlc2NyaWJlLFxuICBpdCxcbiAgZml0LFxuICB4aXQsXG4gIGJlZm9yZUVhY2gsXG4gIGFmdGVyRWFjaCxcbiAgYmVmb3JlRWFjaFByb3ZpZGVycyxcbiAgaW5qZWN0XG59IGZyb20gJ2FuZ3VsYXIyL3Rlc3RpbmcnO1xuaW1wb3J0IHtwcm92aWRlfSBmcm9tICdhbmd1bGFyMi9jb3JlJztcblxudmFyIGRiOiBhbnk7XG5jbGFzcyBNeVNlcnZpY2Uge31cbmNsYXNzIE15TW9ja1NlcnZpY2UgaW1wbGVtZW50cyBNeVNlcnZpY2Uge31cblxuLy8gI2RvY3JlZ2lvbiBkZXNjcmliZUl0XG5kZXNjcmliZSgnc29tZSBjb21wb25lbnQnLCAoKSA9PiB7XG4gIGl0KCdkb2VzIHNvbWV0aGluZycsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSB0ZXN0LlxuICAgICAgICAgICAgICAgICAgICAgICB9KTtcbn0pO1xuLy8gI2VuZGRvY3JlZ2lvblxuXG4vLyAjZG9jcmVnaW9uIGZkZXNjcmliZVxuZmRlc2NyaWJlKCdzb21lIGNvbXBvbmVudCcsICgpID0+IHtcbiAgaXQoJ2hhcyBhIHRlc3QnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgdGVzdCB3aWxsIHJ1bi5cbiAgICAgICAgICAgICAgICAgICB9KTtcbn0pO1xuZGVzY3JpYmUoJ2Fub3RoZXIgY29tcG9uZW50JyxcbiAgICAgICAgICgpID0+IHsgaXQoJ2Fsc28gaGFzIGEgdGVzdCcsICgpID0+IHsgdGhyb3cgJ1RoaXMgdGVzdCB3aWxsIG5vdCBydW4uJzsgfSk7IH0pO1xuLy8gI2VuZGRvY3JlZ2lvblxuXG4vLyAjZG9jcmVnaW9uIHhkZXNjcmliZVxueGRlc2NyaWJlKCdzb21lIGNvbXBvbmVudCcsICgpID0+IHsgaXQoJ2hhcyBhIHRlc3QnLCAoKSA9PiB7dGhyb3cgJ1RoaXMgdGVzdCB3aWxsIG5vdCBydW4uJ30pOyB9KTtcbmRlc2NyaWJlKCdhbm90aGVyIGNvbXBvbmVudCcsICgpID0+IHtcbiAgaXQoJ2Fsc28gaGFzIGEgdGVzdCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIHRlc3Qgd2lsbCBydW4uXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbn0pO1xuLy8gI2VuZGRvY3JlZ2lvblxuXG4vLyAjZG9jcmVnaW9uIGZpdFxuZGVzY3JpYmUoJ3NvbWUgY29tcG9uZW50JywgKCkgPT4ge1xuICBmaXQoJ2hhcyBhIHRlc3QnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIHRlc3Qgd2lsbCBydW4uXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICBpdCgnaGFzIGFub3RoZXIgdGVzdCcsICgpID0+IHsgdGhyb3cgJ1RoaXMgdGVzdCB3aWxsIG5vdCBydW4uJzsgfSk7XG59KTtcbi8vICNlbmRkb2NyZWdpb25cblxuLy8gI2RvY3JlZ2lvbiB4aXRcbmRlc2NyaWJlKCdzb21lIGNvbXBvbmVudCcsICgpID0+IHtcbiAgeGl0KCdoYXMgYSB0ZXN0JywgKCkgPT4geyB0aHJvdyAnVGhpcyB0ZXN0IHdpbGwgbm90IHJ1bi4nOyB9KTtcbiAgaXQoJ2hhcyBhbm90aGVyIHRlc3QnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgdGVzdCB3aWxsIHJ1bi5cbiAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbn0pO1xuLy8gI2VuZGRvY3JlZ2lvblxuXG4vLyAjZG9jcmVnaW9uIGJlZm9yZUVhY2hcbmRlc2NyaWJlKCdzb21lIGNvbXBvbmVudCcsICgpID0+IHtcbiAgYmVmb3JlRWFjaCgoKSA9PiB7IGRiLmNvbm5lY3QoKTsgfSk7XG4gIGl0KCd1c2VzIHRoZSBkYicsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERhdGFiYXNlIGlzIGNvbm5lY3RlZC5cbiAgICAgICAgICAgICAgICAgICAgfSk7XG59KTtcbi8vICNlbmRkb2NyZWdpb25cblxuLy8gI2RvY3JlZ2lvbiBiZWZvcmVFYWNoUHJvdmlkZXJzXG5kZXNjcmliZSgnc29tZSBjb21wb25lbnQnLCAoKSA9PiB7XG4gIGJlZm9yZUVhY2hQcm92aWRlcnMoKCkgPT4gW3Byb3ZpZGUoTXlTZXJ2aWNlLCB7dXNlQ2xhc3M6IE15TW9ja1NlcnZpY2V9KV0pO1xuICBpdCgndXNlcyBNeVNlcnZpY2UnLCBpbmplY3QoW015U2VydmljZV0sIChzZXJ2aWNlOiBNeU1vY2tTZXJ2aWNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHNlcnZpY2UgaXMgYW4gaW5zdGFuY2Ugb2YgTXlNb2NrU2VydmljZS5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSk7XG59KTtcbi8vICNlbmRkb2NyZWdpb25cblxuLy8gI2RvY3JlZ2lvbiBhZnRlckVhY2hcbmRlc2NyaWJlKCdzb21lIGNvbXBvbmVudCcsICgpID0+IHtcbiAgYWZ0ZXJFYWNoKChkb25lOiBGdW5jdGlvbikgPT4geyBkYi5yZXNldCgpLnRoZW4oKF86IGFueSkgPT4gZG9uZSgpKTsgfSk7XG4gIGl0KCd1c2VzIHRoZSBkYicsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgdGVzdCBjYW4gbGVhdmUgdGhlIGRhdGFiYXNlIGluIGEgZGlydHkgc3RhdGUuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgYWZ0ZXJFYWNoIHdpbGwgZW5zdXJlIGl0IGdldHMgcmVzZXQuXG4gICAgICAgICAgICAgICAgICAgIH0pO1xufSk7XG4vLyAjZW5kZG9jcmVnaW9uXG4iXX0=