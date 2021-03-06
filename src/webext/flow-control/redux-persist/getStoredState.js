// @flow

import type { PersistConfig } from './types'

import { KEY_PREFIX } from './constants'

export default function getStoredState(config: PersistConfig): Promise<Object> {
  return new Promise((resolve, reject) => {
    const transforms = config.transforms || []
    const storageKey = `${config.keyPrefix !== undefined
      ? config.keyPrefix
      : KEY_PREFIX}${config.key}`
    const storage = config.storage
    const debug = config.debug

    storage.getItem(storageKey, (err, serialized) => {
      if (err) {
        if (process.env.NODE_ENV !== 'production' && debug)
          console.log('redux-persist/getStoredState: Error in storage.get', err)
        reject(err)
      }

      if (!serialized) resolve(undefined)
      else {
        try {
          let state = {}
          let rawState = deserialize(serialized);
          // run transforms on each state key in paralell, run transforms within a key in serial
          (async function() {
            const keyTransforms = Object.keys(rawState).map( async key => {
              state[key] = deserialize(rawState[key]);
              const transformsCnt = transforms.length - 1;
              for (let i=transformsCnt; i>=0; i--) {
                const transformer = transforms[i];
                state[key] = await transformer.out(state[key], key);
              }
            })
            await Promise.all(keyTransforms);
            resolve(state);
          })();
          // Object.keys(rawState).forEach(key => {
          //   state[key] = transforms.reduceRight((subState, transformer) => {
          //     return transformer.out(subState, key)
          //   }, deserialize(rawState[key]))
          // })
          // resolve(state)
        } catch (err) {
          if (process.env.NODE_ENV !== 'production' && debug)
            console.log(
              `redux-persist/getStoredState: Error restoring data ${serialized}`,
              err
            )
          reject(err)
        }
      }
    })
  })
}

function deserialize(serial) {
  return JSON.parse(serial)
}
