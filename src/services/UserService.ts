import fetch from "node-fetch"
import { Tile } from "../index.js";


export class UserService {
	#email
	#password
	#cookie

	constructor(email, password) {
		this.#email = email
		this.#password = password
		this.#cookie = undefined
	}

	async login() {
		let response = await fetch("https://production.tile-api.com/api/v1/clients/26726553-703b-3998-9f0e-c5f256caaf6d/sessions", {
			method: "POST",
			headers: {
				...this.getHeaders(false),
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: new URLSearchParams({
				email: this.#email,
				password: this.#password
			})
		})

		let cookie = response.headers.get("set-cookie")

		let responseBody = await response.json()
		this.handleError(responseBody)

		if(responseBody?.result?.message === "Invalid credentials") {
			throw Error("Tile API reported Invalid credentials");
		}

		this.#cookie = cookie
	}

	async handleError(responseBody){
		let {result, result_code} = responseBody
		if (result_code !== 0) {
			throw Error(`Error code ${result_code}: ${result?.message}`)
		}
	}


	async getTiles(): Promise<Tile[]> {
		let response = await fetch("https://production.tile-api.com/api/v1/users/groups?last_modified_timestamp=0", {
			headers: this.getHeaders()
		}).then(r => r.json())

		this.handleError(response)

		let nodes: object = response.result.nodes
		let tiles: Tile[] = []

		for(const [id, tileObj] of Object.entries(nodes)){
			if(tileObj?.node_type !== "TILE"){
				continue
			}

			let {auth_key, name, product_code, firmware} = tileObj

			let tile = new Tile(id, auth_key, name, product_code, firmware.expected_tdt_cmd_config)
			tiles.push(tile)
		}

		return tiles
	}

	getHeaders(includeCookie: boolean = true): object {
		return {
			"User-Agent": "Tile/android/2.109.0/4485 (Unknown; Android11)",
			tile_app_id: "android-tile-production",
			tile_app_version: "2.109.0.4485",
			tile_client_uuid: "26726553-703b-3998-9f0e-c5f256caaf6d",
			tile_request_timestamp: new Date().getTime(),
			Cookie: includeCookie ? this.#cookie : undefined
		}
	}
}