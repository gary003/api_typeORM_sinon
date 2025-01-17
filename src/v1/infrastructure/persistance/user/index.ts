import { Wallet } from '../wallet/entity'
import { connectionDB } from '../connection/connectionFile'
import { User } from './entity'
import { createNewWalletDB, deleteWalletByIdDB } from '../wallet'
import { userInfo } from './dto'
import logger from '../../../helpers/logger'
import { Readable } from 'stream'
import { ReadStream } from 'typeorm/platform/PlatformTools'

export const getAllUsersDB = async (): Promise<userInfo[]> => {
  const connection = await connectionDB()

  const UserRepository = connection.getRepository(User)

  const result = await UserRepository.createQueryBuilder('user')
    .innerJoinAndMapOne('user.Wallet', Wallet, 'wallet', 'wallet.userId = user.userId')
    .getMany()
    .catch((err) => {
      logger.error(err.sqlMessage)
      return null
    })

  await connection.destroy()

  if (!result) throw new Error('Impossible to retreive any user')

  // logger.debug(JSON.stringify(result))

  return result as userInfo[]
}

export const userStreamAdaptor = async function* (source: ReadStream): AsyncGenerator<string> {
  try {
    for await (const chunk of source) {
      const adaptedData: userInfo = {
        userId: chunk.user_userId,
        firstname: chunk.user_firstname,
        lastname: chunk.user_lastname,
        Wallet: {
          walletId: chunk.wallet_walletId,
          hardCurrency: chunk.wallet_hardCurrency,
          softCurrency: chunk.wallet_softCurrency
        }
      }

      yield JSON.stringify(adaptedData) + '\n'
    }
  } catch (err) {
    throw err instanceof Error ? err : new Error('Adaptor error')
  }
}

export const getAllUsersStreamDB = async (): Promise<Readable> => {
  const connection = await connectionDB()

  const UserRepository = connection.getRepository(User)

  const userStream = await UserRepository.createQueryBuilder('user').innerJoinAndMapOne('user.Wallet', Wallet, 'wallet', 'wallet.userId = user.userId').stream()

  userStream.on('end', () => connection.destroy())

  // Convert the generator to a readable stream
  const readableStream = Readable.from(userStreamAdaptor(userStream), {
    objectMode: true
  })

  return readableStream
}

export const saveNewUserDB = async (userId: string, firstname: string, lastname: string): Promise<User> => {
  const newUser = new User()
  newUser.userId = userId
  newUser.firstname = firstname
  newUser.lastname = lastname

  const walletCreation = await createNewWalletDB(newUser).catch((err) => {
    logger.error(err)
    return null
  })

  if (!walletCreation) throw new Error('Impossible to create a new wallet or user')

  return newUser
}

export const deleteUserByIdDB = async (userId: string): Promise<boolean> => {
  const connection = await connectionDB()

  const userToDeleteInfo = await getUserWalletInfoDB(userId).catch((err) => {
    logger.error(err)
    return null
  })

  if (!userToDeleteInfo) {
    await connection.destroy()
    throw new Error('Impossible to delete the user in DB, no user information available (step : 0)')
  }
  // logger.debug(JSON.stringify(userToDeleteInfo))

  if (userToDeleteInfo.Wallet) {
    const walletDeletion = await deleteWalletByIdDB(String(userToDeleteInfo.Wallet.walletId)).catch((err) => {
      logger.error(err)
      return null
    })

    if (!walletDeletion) {
      await connection.destroy()
      throw new Error('Impossible to delete the user in DB (step : 1)')
    }
  }

  // Let the db some time to handle the previous request
  await new Promise((resolve) => setTimeout(resolve, 709))

  const UserRepository = connection.getRepository(User)

  const deletedUser = await UserRepository.delete(userId).catch((err) => {
    logger.error(err)
    return null
  })

  if (!deletedUser || deletedUser.affected === 0) {
    await connection.destroy()
    throw new Error('Impossible to delete the user in DB (step : 2)')
  }

  await connection.destroy()

  return true
}

export const getUserWalletInfoDB = async (userId: string): Promise<userInfo> => {
  const connection = await connectionDB()

  const UserRepository = connection.getRepository(User)

  const userWalletInfo = await UserRepository.createQueryBuilder('user')
    .innerJoinAndMapOne('user.Wallet', Wallet, 'wallets', 'wallets.userId = user.userId')
    .where('user.userId = :userId', { userId: userId })
    .getOne()
    .catch((err) => err)

  await connection.destroy()

  return userWalletInfo as userInfo
}

// // Create a transform stream from your generator
// const createAdaptorStream = () => {
//   return new Transform({
//     objectMode: true,
//     transform(chunk, _, callback) {
//       try {
//         const structuredData = {
//           userId: chunk.user_userId,
//           firstname: chunk.user_firstname,
//           lastname: chunk.user_lastname,
//           wallet: {
//             walletId: chunk.wallet_walletId,
//             hardCurrency: chunk.wallet_hardCurrency,
//             softCurrency: chunk.wallet_softCurrency,
//             userId: chunk.wallet_userId
//           }
//         }
//         callback(null, JSON.stringify(structuredData) + '\n')
//       } catch (err) {
//         callback(err instanceof Error ? err : new Error('Transform error'))
//       }
//     }
//   })
// }

// export const getAllUsersStreamDB = async (): Promise<any> => {
//   const connection = await connectionDB()

//   const UserRepository = connection.getRepository(User)

//   const userStream = await UserRepository.createQueryBuilder('user').innerJoinAndMapOne('user.Wallet', Wallet, 'wallet', 'wallet.userId = user.userId').stream()

//   // userStream.on('data', (d) => console.log(d))

//   // !! Nevere do this ! because the stream will be destroy before the end of the process and make everything fail !!
//   // userStream.on('end', () => userStream.close())

//   return userStream.pipe(createAdaptorStream())
// }
