/**
 * SearchBar — search input for aircraft tail number (e.g. N123AB).
 * Submitting the form calls the parent's onSearch callback with the normalized tail string.
 * No asynchronous calls in this component; any API lookup is handled by the parent (e.g. Home page).
 */
import { useState, useRef } from 'react';
import { Form, Button } from 'react-bootstrap';
import { Typeahead } from 'react-bootstrap-typeahead';
import { AircraftPosition } from '../api';

const minInput = 2; // minimum characters before showing suggestions
const maxResults = 10; // maximum number of suggestions to show

interface SearchBarProps {
    onSearch?: (tail: string) => void;
    planeLocationData?: AircraftPosition[]; // used for autocomplete suggestions
}

/**
 * Renders a search form and calls the parent's search handler with the entered tail number.
 * @param {Object} props
 * @param {(tail: string) => void} [props.onSearch] - Callback invoked on submit with trimmed, uppercased tail (e.g. "N123AB"). Parent may perform async API/backend lookup.
 */
export default function SearchBar({ onSearch, planeLocationData }: SearchBarProps) {
    const [selected, setSelected] = useState<AircraftPosition[]>([]);
    const [inputText, setInputText] = useState('');
    const typeaheadRef = useRef<any>(null);

    /**
     * Handles form submit: normalizes input (trim + uppercase), calls onSearch, then clears the field.
     * Synchronous; if the parent does async work (e.g. fetch aircraft by tail), that runs after this returns.
     * @param {React.FormEvent<HTMLFormElement>} e - Form submit event
     */
    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const icao24 = selected[0]?.icao24.trim().toLowerCase();

        if (!icao24) return;

        onSearch?.(icao24);
        setSelected([]);
    }

    /**
     * used by typeahead to search for planes matching the input based on ICAO24, callsign, or origin country
     *
     * @param {any} option - plane option from the list (should be AircraftPosition)
     * @param {any} props - typeahead props, including the current input text (props.text)
     */
    const filterByCallback = (option: any, props: any): boolean => {
        const plane = option as AircraftPosition;
        return (
            plane.icao24.toLowerCase().indexOf(props.text.toLowerCase()) !== -1 ||
            (plane.callsign != null &&
                plane?.callsign.toLowerCase().indexOf(props.text.toLowerCase()) !== -1) ||
            (plane.originCountry != null &&
                plane?.originCountry.toLowerCase().indexOf(props.text.toLowerCase()) !== -1)
        );
    };

    /**
     * Handle keyboard events in the input
     * On Enter: if nothing selected, select the first matching option
     */
    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && selected.length === 0 && inputText.trim()) {
            // Find first matching option
            const firstMatch = (planeLocationData || []).find((option) =>
                filterByCallback(option, { text: inputText }),
            );

            if (firstMatch) {
                setSelected([firstMatch]);
                // Manually trigger search since onChange won't fire for programmatic selection
                const icao24 = firstMatch.icao24.trim().toLowerCase();
                onSearch?.(icao24);
                setSelected([]);
                setInputText('');
                typeaheadRef.current?.clear();
            }
        }
    };

    return (
        <div data-bs-theme='dark'>
            <Form className='d-flex' onSubmit={handleSubmit}>
                <Typeahead
                    ref={typeaheadRef}
                    id='plane-search'
                    options={planeLocationData || []}
                    labelKey={(option) => {
                        const plane = option as AircraftPosition;
                        return plane.icao24;
                    }}
                    selected={selected}
                    filterBy={filterByCallback}
                    onChange={(selected) => {
                        setSelected(selected as AircraftPosition[]);
                        const icao24 = (selected[0] as AircraftPosition)?.icao24
                            .trim()
                            .toLowerCase();
                        if (icao24) {
                            onSearch?.(icao24);
                            setSelected([]);
                            setInputText('');
                            typeaheadRef.current?.clear();
                        }
                    }}
                    onInputChange={(text) => {
                        setInputText(text);
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder='Search callsign or ICAO24'
                    className='me-2'
                    minLength={minInput}
                    maxResults={maxResults}
                    highlightOnlyResult={true}
                    renderMenuItemChildren={(
                        option, // custom rendering for each suggestion
                    ) => (
                        <div>
                            <b>{(option as AircraftPosition).callsign ?? 'N/A'}</b>
                            <div>
                                <small>ICAO: {(option as AircraftPosition).icao24}</small>
                                <br />
                                <small>From: {(option as AircraftPosition).originCountry}</small>
                            </div>
                        </div>
                    )}
                />
                <Button type='submit' variant='primary'>
                    Search
                </Button>
            </Form>
        </div>
    );
}
