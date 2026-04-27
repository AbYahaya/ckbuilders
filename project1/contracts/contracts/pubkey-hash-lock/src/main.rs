#![cfg_attr(not(any(feature = "library", test)), no_std)]
#![cfg_attr(not(test), no_main)]

#[cfg(not(any(feature = "library", test)))]
ckb_std::entry!(program_entry);
#[cfg(not(any(feature = "library", test)))]
ckb_std::default_alloc!(16384, 1258306, 64);

use ckb_std::ckb_constants::Source;
use ckb_std::high_level::{load_script, load_witness_args};
use ckb_std::syscalls::SysError;

use blake2b_ref::Blake2bBuilder;

const ARGS_LEN: usize = 32;

#[repr(i8)]
enum Error {
    LoadScript = 1,
    InvalidArgsLen = 2,
    LoadWitness = 3,
    MissingWitnessLock = 4,
    HashMismatch = 5,
}

impl From<SysError> for Error {
    fn from(_: SysError) -> Self {
        Error::LoadWitness
    }
}

fn run() -> Result<(), Error> {
    let script = load_script().map_err(|_| Error::LoadScript)?;
    let args = script.args().raw_data();
    if args.len() != ARGS_LEN {
        return Err(Error::InvalidArgsLen);
    }

    let witness = load_witness_args(0, Source::GroupInput).map_err(|_| Error::LoadWitness)?;
    let lock = witness.lock().to_opt().ok_or(Error::MissingWitnessLock)?;
    let preimage = lock.raw_data();

    let mut actual_hash = [0u8; 32];
    let mut blake2b = Blake2bBuilder::new(32).build();
    blake2b.update(preimage.as_ref());
    blake2b.finalize(&mut actual_hash);

    if args.as_ref() != actual_hash {
        return Err(Error::HashMismatch);
    }

    Ok(())
}

pub fn program_entry() -> i8 {
    match run() {
        Ok(()) => 0,
        Err(err) => err as i8,
    }
}
