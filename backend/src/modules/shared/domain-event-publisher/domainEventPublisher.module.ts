import { Global, Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { DomainEventPublisher } from "@shared/domain-event-publisher/adapters/domainEventPublisher";

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [DomainEventPublisher],
  exports: [DomainEventPublisher],
})
export class DomainEventPublisherModule {}
