import {
  DeleteResult,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  InsertResult,
  ObjectId,
  ObjectLiteral,
  Repository,
  UpdateResult,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

export class BaseRepository<T extends ObjectLiteral> {
  public repository: Repository<T>;
  constructor(repository: Repository<T>) {
    this.repository = repository;
  }

  public async find(options: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  public async findAndCount(options?: FindManyOptions<T> | undefined): Promise<[T[], number]> {
    return this.repository.findAndCount(options);
  }

  public async count(options?: FindManyOptions<T> | undefined): Promise<number> {
    return this.repository.count(options);
  }

  public async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  public async create(entity: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[]): Promise<T> {
    await this.repository.insert(entity);

    return entity as T;
  }

  public async updateMany(entities: T[]): Promise<T[]> {
    return this.repository.save(entities);
  }

  public async update(id: number | string | FindOptionsWhere<T>, updateData: Partial<T>): Promise<UpdateResult> {
    return this.repository.update(id, updateData);
  }

  public async save(entity: T): Promise<T> {
    const [savedEntity] = await this.repository.save([entity]);
    return savedEntity;
  }


  public async delete(
    criteria: string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<T>,
  ): Promise<DeleteResult> {
    return await this.repository.delete(criteria);
  }

  public async insert(entity: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[]): Promise<InsertResult> {
    return this.repository.insert(entity);
  }
}
