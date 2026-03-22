const url = "https://pokeapi.co/api/v2/pokemon/charmander";

type PokeApiPokemon = {
    name: string;
    id: number;
    height: number;
    weight: number;
    types: { slot: number; type: { name: string } }[];
    abilities: { ability: { name: string }; is_hidden: boolean }[];
    stats: { base_stat: number; stat: { name: string } }[];
};

async function main() {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = (await res.json()) as PokeApiPokemon;

    const types = data.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name).join(", ");
    const abilities = data.abilities
        .map((a) => `${a.ability.name}${a.is_hidden ? " (hidden)" : ""}`)
        .join(", ");
    const stats = data.stats.map((s) => `  ${s.stat.name}: ${s.base_stat}`).join("\n");

    console.log(`#${data.id} ${data.name}`);
    console.log(`Types: ${types}`);
    console.log(`Height: ${data.height / 10} m  |  Weight: ${data.weight / 10} kg`);
    console.log(`Abilities: ${abilities}`);
    console.log("Base stats:");
    console.log(stats);
    console.log(`\nSource: ${url}`);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    throw err;
});
