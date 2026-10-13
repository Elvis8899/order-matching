import { DomainEventPublisherModule } from "@shared/domain-event-publisher/domainEventPublisher.module";
import { executeTask } from "@shared/utils/application/executeTask";
import { UserBuilder } from "@test/data-builders/userBuilder";
import { UnitModule } from "@test/util/defaultModule.unit";
import { FakeUserRepository } from "@user/database/fakeUser.repository";
import { UserRepository } from "@user/database/user.repository.port";
import {
  PaginatedUsersQuery,
  PaginatedUsersQueryHandler,
} from "@user/queries/paginatedUsers/paginatedUsers.query";

describe("[Unit] List Users", () => {
  const modRef = new UnitModule(
    {
      imports: [DomainEventPublisherModule],
      providers: [
        ...UnitModule.unitDefaultProviders,
        PaginatedUsersQueryHandler,
        { provide: UserRepository, useClass: FakeUserRepository },
      ],
    },
    (ref) => ({
      userRepository: ref.get(UserRepository),
      paginatedUsersQueryHandler: ref.get(PaginatedUsersQueryHandler),
    }),
  );

  beforeEach(async () => {
    await modRef.init();
  });

  it("Should list users if query is valid", async () => {
    //Given a valid query
    const limit = 10;
    const page = 0;
    const query = new PaginatedUsersQuery({
      limit,
      page,
    });

    //With users in database
    const user = new UserBuilder().build();
    await executeTask(modRef.r.userRepository.save(user));

    //When we list users
    const result = await modRef.r.paginatedUsersQueryHandler.execute(query);
    //Then it should show a list of users
    expect(result.data.length).toBe(1);
    expect(result.data[0]).toStrictEqual(user);
    expect(result.count).toBe(1);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Shouldnt list users if page is invalid", async () => {
    //Given a valid query
    const limit = 10;
    const page = 1;
    const query = new PaginatedUsersQuery({
      limit,
      page,
    });

    //With users in database
    const user = new UserBuilder().build();
    await executeTask(modRef.r.userRepository.save(user));

    //When we list users
    const result = await modRef.r.paginatedUsersQueryHandler.execute(query);
    //Then it should show a list of users
    expect(result.data.length).toBe(0);
    expect(result.count).toBe(1);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });

  it("Shouldnt list users if there isnt users", async () => {
    //Given a valid query and no users in database
    const limit = 10;
    const page = 0;
    const query = new PaginatedUsersQuery({
      limit,
      page,
    });

    //When we list users
    const result = await modRef.r.paginatedUsersQueryHandler.execute(query);
    //Then it should show an empty list
    expect(result.data.length).toBe(0);
    expect(result.count).toBe(0);
    expect(result.page).toBe(page);
    expect(result.limit).toBe(limit);
  });
});
